// Add loading confirmation
console.log("🚀 Content script loaded on:", window.location.href);

function extractEmailContent() {
  console.log("🔍 Starting extractEmailContent...");
  
  let subject = "";
  let from = "";
  let bodyHtml = "";
  let bodyText = "";

  // Gmail - Thử nhiều selector khác nhau
  if (window.location.host.includes("mail.google.com")) {
    console.log("📧 Detected Gmail, extracting content...");
    
    // Subject selectors
    const subjectSelectors = [
      'h2[data-legacy-thread-id]', 
      '.hP',
      '[data-smartmail="subject"]',
      '.bog'
    ];
    
    for (const selector of subjectSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        subject = element.innerText;
        console.log(`Subject found with selector: ${selector}`, subject);
        break;
      }
    }

    // From selectors
    const fromSelectors = [
      '.go .g2', 
      '.gD', 
      '.g2',
      '.gn .go .g2'
    ];
    
    for (const selector of fromSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        from = element.innerText.trim();
        const emailMatch = from.match(/<([^>]+)>/);
        if (emailMatch) {
          from = emailMatch[1];
        }
        console.log(`From found with selector: ${selector}`, from);
        break;
      }
    }

    // Body selectors - Quan trọng nhất cho highlight
    const bodySelectors = [
      '.ii.gt div[dir="ltr"]',
      '.a3s.aiL', 
      '.ii.gt .a3s',
      '[data-smartmail="gmail_quote"] ~ div',
      '.ii.gt'
    ];
    
    for (const selector of bodySelectors) {
      const element = document.querySelector(selector);
      if (element) {
        bodyHtml = element.innerHTML;
        bodyText = element.innerText;
        console.log(`Body found with selector: ${selector}`, { 
          htmlLength: bodyHtml.length, 
          textLength: bodyText.length 
        });
        break;
      }
    }
  } 
  // Outlook
  else if (window.location.host.includes("outlook.live.com") || window.location.host.includes("outlook.office.com")) {
    console.log("📧 Detected Outlook, extracting content...");
    const emailSubjectElement = document.querySelector('[data-testid="message-subject"]');
    if (emailSubjectElement) {
      subject = emailSubjectElement.innerText;
    }

    const emailFromElement = document.querySelector('[data-testid="message-from"] button');
    if (emailFromElement) {
      from = emailFromElement.getAttribute('title') || emailFromElement.innerText;
    }

    const emailBodyContainer = document.querySelector('[data-testid="message-body-content"]');
    if (emailBodyContainer) {
      bodyHtml = emailBodyContainer.innerHTML;
      bodyText = emailBodyContainer.innerText;
    }
  } else {
    console.warn("❌ Unsupported email platform:", window.location.host);
  }

  const result = { subject, from, bodyHtml, bodyText, originalHtmlBody: bodyHtml };
  console.log("✅ Extract completed:", {
    subject: subject.substring(0, 50) + "...",
    from: from.substring(0, 30) + "...",
    bodyTextLength: bodyText.length,
    bodyHtmlLength: bodyHtml.length
  });
  
  return result;
}

function displayXAIResults(prediction, explanation, originalHtmlBody) {
  console.log("🎨 Starting displayXAIResults...");
  console.log("Prediction:", prediction);
  console.log("Explanation items:", explanation?.length || 0);

  // Find email body container với nhiều selector
  let emailBodyContainer;
  const selectors = [
    '.ii.gt div[dir="ltr"]',
    '.a3s.aiL', 
    '.ii.gt .a3s',
    '[data-testid="message-body-content"]'
  ];

  for (const selector of selectors) {
    emailBodyContainer = document.querySelector(selector);
    if (emailBodyContainer) {
      console.log(`Email body container found with selector: ${selector}`);
      break;
    }
  }

  if (!emailBodyContainer) {
    console.warn("Không tìm thấy container email body để highlight.");
    console.log("Available elements:", document.querySelectorAll('div').length);
    
    // Thử highlight trực tiếp trên body để test
    document.body.innerHTML += '<div style="position:fixed;top:10px;right:10px;background:red;color:white;padding:10px;z-index:9999;">HIGHLIGHT TEST - No container found</div>';
    return;
  }

  // Test highlight đơn giản trước
  const testHighlight = document.createElement('div');
  testHighlight.innerHTML = '<span style="background:yellow;color:red;font-weight:bold;">🚨 TEST HIGHLIGHT WORKING 🚨</span>';
  testHighlight.style.cssText = 'position:fixed;top:10px;right:10px;background:green;color:white;padding:10px;z-index:9999;';
  document.body.appendChild(testHighlight);

  if (!explanation || !Array.isArray(explanation)) {
    console.warn("Explanation data không hợp lệ:", explanation);
    return;
  }

  // Sử dụng text content thay vì HTML để tránh lỗi index
  const originalText = emailBodyContainer.innerText || emailBodyContainer.textContent || "";
  console.log("Working with text length:", originalText.length);

  if (originalText.length === 0) {
    console.warn("Email content is empty");
    return;
  }

  // Tạo highlight dựa trên text positions
  let highlightedText = originalText;
  
  // Sắp xếp theo thứ tự ngược để không ảnh hưởng index
  explanation.sort((a, b) => b.start - a.start);

  for (const item of explanation) {
    const { word, score, start, end } = item;
    console.log(`Processing highlight: word="${word}", score=${score}, start=${start}, end=${end}`);
    
    // Validate positions
    if (start < 0 || end > highlightedText.length || start >= end) {
      console.warn(`Invalid highlight position: start=${start}, end=${end}, textLength=${highlightedText.length}`);
      continue;
    }

    let highlightClass = 'phishing-highlight-neutral';
    if (score > 0.5) {
      highlightClass = 'phishing-highlight-high';
    } else if (score > 0.1) {
      highlightClass = 'phishing-highlight-medium';
    }

    const before = highlightedText.substring(0, start);
    const highlighted = highlightedText.substring(start, end);
    const after = highlightedText.substring(end);

    highlightedText = `${before}<span class="${highlightClass}" title="Score: ${score.toFixed(2)} - Word: ${word}">${highlighted}</span>${after}`;
    console.log(`Applied highlight for: "${highlighted}" with class: ${highlightClass}`);
  }

  // Replace content with highlighted version
  console.log("Replacing email content with highlighted version");
  emailBodyContainer.innerHTML = highlightedText;
  
  // Add confirmation message
  const confirmMsg = document.createElement('div');
  confirmMsg.innerHTML = '✅ Highlights applied successfully!';
  confirmMsg.style.cssText = 'background:#d4edda;color:#155724;padding:8px;margin:10px 0;border:1px solid #c3e6cb;border-radius:4px;';
  emailBodyContainer.insertBefore(confirmMsg, emailBodyContainer.firstChild);
  
  console.log("✅ displayXAIResults completed");
}

// Message listener với better debugging
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Content script received message:", message.type);
  console.log("Full message:", message);
  
  try {
    switch (message.type) {
      case "GET_EMAIL_CONTENT":
        console.log("🔄 Processing GET_EMAIL_CONTENT...");
        const emailData = extractEmailContent();
        
        if (!emailData.subject && !emailData.bodyText) {
          console.warn("⚠️ No email content extracted");
          sendResponse({ 
            status: "error", 
            message: "Không tìm thấy nội dung email. Vui lòng mở một email và thử lại." 
          });
        } else {
          console.log("✅ Email content extracted successfully");
          sendResponse({ status: "success", emailData: emailData });
        }
        return true;

      case "DISPLAY_XAI_RESULTS":
        console.log("🎨 Processing DISPLAY_XAI_RESULTS...");
        displayXAIResults(message.prediction, message.explanation, message.originalHtmlBody);
        break;

      case "DISPLAY_ERROR":
        console.error("❌ Display error:", message.message);
        alert("Lỗi phân tích: " + message.message);
        break;
        
      case "TEST_MESSAGE":
        console.log("🧪 Test message received successfully");
        break;

      default:
        console.warn("❓ Unknown message type:", message.type);
    }
  } catch (error) {
    console.error("💥 Error in message handler:", error);
    sendResponse({ status: "error", message: error.message });
  }
});

// Test connection on load
setTimeout(() => {
  chrome.runtime.sendMessage({ type: "CONTENT_SCRIPT_READY" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("❌ Failed to connect to background:", chrome.runtime.lastError.message);
    } else {
      console.log("✅ Successfully connected to background script");
    }
  });
}, 1000);
