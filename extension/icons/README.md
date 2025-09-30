# Icons cho Tiện ích mở rộng Phishing Detector

Cần tạo 3 icon với kích thước sau:
- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels  
- `icon128.png` - 128x128 pixels

Có thể sử dụng các công cụ online như:
- https://favicon.io/favicon-generator/
- https://www.canva.com/

Thiết kế nên liên quan đến bảo mật email (ví dụ: khiên, email với dấu cảnh báo)

## Fix lỗi encoding phổ biến

### Lỗi hiển thị "PhĂ¡t hiá»‡n Phishing"
Đây là lỗi UTF-8 encoding. Cần kiểm tra:
1. **File encoding**: Lưu tất cả file .html, .js với encoding UTF-8
2. **Meta charset**: Đảm bảo popup.html có `<meta charset="UTF-8">`
3. **Editor settings**: VS Code → File → Preferences → Settings → search "encoding" → set UTF-8

### Tạo mock data để test (không cần API thật)
Tạo file `mock-test.js` trong thư mục extension để test offline:

```javascript
// Mock response cho test
const MOCK_RESPONSES = {
  predict: {
    is_phishing: true,
    confidence: 0.85
  },
  explain: {
    explanation: [
      { word: "urgent", score: 0.9, start: 5, end: 11 },
      { word: "click here", score: 0.7, start: 20, end: 30 },
      { word: "verify account", score: 0.8, start: 40, end: 54 }
    ]
  }
};
```

## Debug Highlight Issues

### Lỗi "Chưa thấy highlight gì trên email cả"
Các bước debug:
1. **Kiểm tra CSS đã load**: F12 → Elements → tìm class `phishing-highlight-high`
2. **Kiểm tra content script chạy**: Console → xem log "displayXAIResults"
3. **Kiểm tra selector**: Console → `document.querySelector('.a3s.aiL')` có trả về element không
4. **Test manual highlight**: Console → chạy lệnh test highlight

### Debug Message Flow Issues
Khi thấy log "Tin nhận được trong Background Script" nhưng không có highlight:

1. **Kiểm tra content script load**: 
   - Mở Gmail → F12 → Console
   - Reload page → xem có log "Content script loaded" không

2. **Kiểm tra tab permissions**:
   ```javascript
   // Trong background service worker console:
   chrome.tabs.query({active: true}, (tabs) => console.log(tabs[0]));
   ```

3. **Test content script trực tiếp**:
   ```javascript
   // Trong Gmail console:
   chrome.runtime.onMessage.addListener((msg) => console.log('Content received:', msg));
   ```

### Lệnh debug trong Console:

**Gmail page Console:**
```javascript
// Test content script
console.log('Testing content script...');
chrome.runtime.sendMessage({type: "TEST_CONTENT"});

// Test extract manual
const result = extractEmailContent();
console.log('Manual extract result:', result);
```

**Background Service Worker Console:**
```javascript
// Test send message to current tab
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, {type: "TEST_MESSAGE"});
});
```

## Hướng dẫn cài đặt và test extension

### Bước 1: Chuẩn bị môi trường
1. **Tạo icons tạm thời** (nếu chưa có):
   - Tạo 3 file PNG đơn giản bằng Paint hoặc tool khác
   - Hoặc copy 1 icon bất kỳ và đổi tên thành icon16.png, icon48.png, icon128.png

### Bước 2: Load extension vào Chrome/Edge
1. Mở Chrome hoặc Edge
2. Gõ `chrome://extensions/` (hoặc `edge://extensions/`)
3. Bật **Developer mode** (góc trên phải)
4. Click **Load unpacked**
5. Chọn thư mục `d:\TotNghiep\phishing-detector[2]\phishing-detector\extension`
6. Extension sẽ xuất hiện trong danh sách với icon và tên "Phát Hiện Phishing Email"

### Bước 3: Kiểm tra extension hoạt động
1. **Kiểm tra icon**: Icon extension xuất hiện trên thanh toolbar
2. **Test popup**: Click vào icon → popup hiển thị giao diện
3. **Kiểm tra console**: F12 → Console → xem có lỗi không

### Bước 4: Test với Gmail/Outlook
1. **Mở Gmail**: Truy cập https://mail.google.com
2. **Mở 1 email bất kỳ**: Click để xem chi tiết email
3. **Click extension icon** → Click "Phân tích Email Hiện tại"
4. **Kiểm tra Console**: 
   - F12 → Console tab
   - Xem log "Trích xuất nội dung email"
   - Kiểm tra có lỗi API không

### Bước 5: Debug phổ biến
1. **Extension không load**: Kiểm tra manifest.json syntax
2. **Không trích xuất được email**: 
   - F12 → Console → xem lỗi CSS selector
   - Thử với email khác
3. **API lỗi**: Thay URL trong background.js thành API thật
4. **Reload extension**: Extensions page → click reload icon

### Bước 6: Test nâng cao (khi có API)
1. Setup AI backend API
2. Cập nhật URL trong background.js
3. Test full workflow: extract → analyze → highlight

### Bước 7: Test với Mock Data (không cần API)
1. Bật mock mode trong background.js
2. Test với dữ liệu giả để xem workflow
3. Kiểm tra highlight và popup results

### Troubleshooting nâng cao:
- **Highlight không hiển thị**: 
  - Kiểm tra CSS selector trong extractEmailContent()
  - Kiểm tra explanation data có start/end hợp lệ
  - Test manual highlight trong console
- **"Không thể lấy nội dung email"**: CSS selector cần cập nhật
- **Popup không hiển thị**: Kiểm tra popup.html path
- **Console errors**: Kiểm tra permissions trong manifest.json
- **Lỗi font tiếng Việt**: Kiểm tra UTF-8 encoding trong tất cả files
