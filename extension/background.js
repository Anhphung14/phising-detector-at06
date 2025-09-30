const AI_API_BASE_URL = "https://your-ai-backend.com/api";
const MOCK_MODE = true;

// Mock data cho test với text positions thực tế
const MOCK_DATA = {
  prediction: {
    is_phishing: true,
    confidence: 0.85
  },
  explanation: [
    { word: "urgent", score: 0.9, start: 0, end: 6 },
    { word: "click", score: 0.7, start: 10, end: 15 },
    { word: "verify", score: 0.8, start: 20, end: 26 },
    { word: "account", score: 0.6, start: 30, end: 37 },
    { word: "immediately", score: 0.9, start: 40, end: 51 }
  ]
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Tin nhắn nhận được trong Background Script:", message);
  console.log("Sender info:", sender);

  switch (message.type) {
    case "ANALYZE_CURRENT_EMAIL":
      console.log("Processing ANALYZE_CURRENT_EMAIL request");
      
      // Use tabId from message if available, otherwise fall back to sender.tab
      const targetTabId = message.tabId || sender.tab?.id;
      
      if (!targetTabId) {
        console.error("No tab ID available");
        sendResponse({ status: "error", message: "Không thể xác định tab để phân tích." });
        return;
      }

      console.log("Sending GET_EMAIL_CONTENT to tab:", targetTabId);
      
      chrome.tabs.sendMessage(targetTabId, { type: "GET_EMAIL_CONTENT" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Chrome runtime error:", chrome.runtime.lastError.message);
          sendResponse({ 
            status: "error", 
            message: "Lỗi giao tiếp với trang web. Vui lòng reload trang và thử lại." 
          });
        } else if (!response) {
          console.error("No response from content script");
          sendResponse({ 
            status: "error", 
            message: "Content script không phản hồi. Vui lòng reload trang Gmail/Outlook." 
          });
        } else {
          console.log("Content script response:", response);
          if (response.status === "success" && response.emailData) {
            processEmailForAI(response.emailData, targetTabId);
            sendResponse({ status: "processing" });
          } else {
            sendResponse({ 
              status: "error", 
              message: response.message || "Không thể lấy nội dung email." 
            });
          }
        }
      });
      return true;

    case "EMAIL_DATA_FOR_AI":
      if (message.emailData && sender.tab && sender.tab.id) {
        processEmailForAI(message.emailData, sender.tab.id);
      }
      break;

    case "POPUP_READY":
      console.log("Popup ready");
      break;

    case "CONTENT_SCRIPT_READY":
      console.log("Content script ready from tab:", sender.tab?.id);
      sendResponse({ status: "connected" });
      break;
  }
});

async function processEmailForAI(emailData, tabId) {
  try {
    if (MOCK_MODE) {
      console.log("Mock mode: Simulating AI analysis...", emailData);
      
      // Tạo mock explanation dựa trên nội dung email thực tế
      const bodyText = emailData.bodyText || "urgent click verify account immediately";
      const mockExplanation = [];
      
      // Tìm các từ khóa phishing phổ biến trong text
      const phishingKeywords = [
        { word: "urgent", score: 0.9 },
        { word: "click", score: 0.7 },
        { word: "verify", score: 0.8 },
        { word: "account", score: 0.6 },
        { word: "immediately", score: 0.9 },
        { word: "suspended", score: 0.8 },
        { word: "confirm", score: 0.7 },
        { word: "login", score: 0.6 },
        { word: "security", score: 0.5 }
      ];
      
      for (const keyword of phishingKeywords) {
        const index = bodyText.toLowerCase().indexOf(keyword.word.toLowerCase());
        if (index !== -1) {
          mockExplanation.push({
            word: keyword.word,
            score: keyword.score,
            start: index,
            end: index + keyword.word.length
          });
        }
      }
      
      // Fallback nếu không tìm thấy keyword nào
      if (mockExplanation.length === 0) {
        mockExplanation.push(...MOCK_DATA.explanation);
      }
      
      console.log("Generated mock explanation:", mockExplanation);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const predictionResult = MOCK_DATA.prediction;
      const explanationResult = { explanation: mockExplanation };
      
      console.log("Mock Kết quả dự đoán AI:", predictionResult);
      console.log("Mock Kết quả giải thích XAI:", explanationResult);

      chrome.tabs.sendMessage(tabId, {
        type: "DISPLAY_XAI_RESULTS",
        prediction: predictionResult,
        explanation: explanationResult.explanation,
        originalHtmlBody: emailData.originalHtmlBody
      });

      chrome.runtime.sendMessage({
        type: "UPDATE_POPUP_RESULTS",
        prediction: predictionResult,
      });
      
      return;
    }

    // Real API calls (when MOCK_MODE = false)
    const predictResponse = await fetch(`${AI_API_BASE_URL}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: emailData.subject,
        from: emailData.from,
        bodyText: emailData.bodyText,
      }),
    });
    const predictionResult = await predictResponse.json();
    console.log("Kết quả dự đoán AI:", predictionResult);

    const explainResponse = await fetch(`${AI_API_BASE_URL}/explain`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: emailData.subject,
        from: emailData.from,
        bodyText: emailData.bodyText,
      }),
    });
    const explanationResult = await explainResponse.json();
    console.log("Kết quả giải thích XAI:", explanationResult);

    chrome.tabs.sendMessage(tabId, {
      type: "DISPLAY_XAI_RESULTS",
      prediction: predictionResult,
      explanation: explanationResult.explanation,
      originalHtmlBody: emailData.originalHtmlBody
    });

    chrome.runtime.sendMessage({
      type: "UPDATE_POPUP_RESULTS",
      prediction: predictionResult,
    });

  } catch (error) {
    console.error("Lỗi khi gọi AI API:", error);
    chrome.tabs.sendMessage(tabId, {
      type: "DISPLAY_ERROR",
      message: "Lỗi trong quá trình phân tích AI: " + error.message,
    });
    chrome.runtime.sendMessage({
      type: "UPDATE_POPUP_RESULTS",
      error: "Lỗi trong quá trình phân tích AI.",
    });
  }
}
