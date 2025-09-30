document.addEventListener('DOMContentLoaded', () => {
    const analyzeButton = document.getElementById('analyzeButton');
    const mockTestButton = document.getElementById('mockTestButton');
    const statusText = document.getElementById('statusText');
    const predictionText = document.getElementById('predictionText');
    const confidenceText = document.getElementById('confidenceText');
    const errorText = document.getElementById('errorText');

    console.log("🚀 Popup loaded");

    analyzeButton.addEventListener('click', () => {
        console.log("🔄 Analyze button clicked");
        statusText.textContent = "Đang phân tích...";
        predictionText.textContent = "";
        confidenceText.textContent = "";
        errorText.textContent = "";
        analyzeButton.disabled = true;

        // Get current tab first, then send message with tab info
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            const currentTab = tabs[0];
            console.log("Current tab:", currentTab?.url);
            
            if (!currentTab) {
                statusText.textContent = "Lỗi";
                errorText.textContent = "Không thể xác định tab hiện tại.";
                analyzeButton.disabled = false;
                return;
            }
            
            if (!currentTab.url.includes('mail.google.com') && 
                !currentTab.url.includes('outlook.live.com') && 
                !currentTab.url.includes('outlook.office.com')) {
                statusText.textContent = "Lỗi";
                errorText.textContent = "Vui lòng mở Gmail hoặc Outlook để sử dụng extension này.";
                analyzeButton.disabled = false;
                return;
            }

            // Send message with tab ID included
            chrome.runtime.sendMessage({ 
                type: "ANALYZE_CURRENT_EMAIL",
                tabId: currentTab.id 
            }, (response) => {
                console.log("Response from background:", response);
                if (response?.status === "error") {
                    statusText.textContent = "Lỗi";
                    errorText.textContent = response.message;
                    analyzeButton.disabled = false;
                } else if (response?.status === "processing") {
                    console.log("Analysis started successfully");
                    // Keep button disabled until UPDATE_POPUP_RESULTS
                }
            });
        });
    });

    // Thêm mock test button handler
    mockTestButton.addEventListener('click', () => {
        statusText.textContent = "Đang test với dữ liệu giả...";
        predictionText.textContent = "";
        confidenceText.textContent = "";
        errorText.textContent = "";
        mockTestButton.disabled = true;

        // Simulate processing delay
        setTimeout(() => {
            // Mock successful result
            statusText.textContent = "Hoàn tất (Mock Test)";
            predictionText.textContent = "Lừa đảo!";
            predictionText.style.color = "red";
            confidenceText.textContent = "85.50%";
            
            mockTestButton.disabled = false;
            
            // Show mock highlight instruction
            console.log("Mock test completed - extension UI working correctly");
        }, 2000);
    });

    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "UPDATE_POPUP_RESULTS") {
            analyzeButton.disabled = false;
            if (message.error) {
                statusText.textContent = "Lỗi";
                errorText.textContent = message.error;
                predictionText.textContent = "Không có";
                confidenceText.textContent = "Không có";
            } else if (message.prediction) {
                statusText.textContent = "Hoàn tất";
                predictionText.textContent = message.prediction.is_phishing ? "Lừa đảo!" : "An toàn.";
                predictionText.style.color = message.prediction.is_phishing ? "red" : "green";
                confidenceText.textContent = `${(message.prediction.confidence * 100).toFixed(2)}%`;
            } else {
                statusText.textContent = "Không có kết quả.";
            }
        }
    });

    chrome.runtime.sendMessage({ type: "POPUP_READY" });
});
