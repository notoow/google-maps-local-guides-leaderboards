/**
 * 인앱 브라우저 감지 및 외부 브라우저 리디렉션
 * 출처: 번개애비의라이프스톼일
 */

(function() {
  function copyToClipboard(val) {
    const t = document.createElement('textarea');
    document.body.appendChild(t);
    t.value = val;
    t.select();
    document.execCommand('copy');
    document.body.removeChild(t);
  }

  // iOS Safari 열기 (전역에서 접근 가능하도록)
  window.openSafari = function() {
    copyToClipboard(window.location.href);
    alert('URL주소가 복사되었습니다.\n\nSafari가 열리면 주소창을 길게 터치한 뒤, "붙여놓기 및 이동"를 누르면 정상적으로 이용하실 수 있습니다.');
    location.href = 'x-web-search://?';
  };

  const userAgent = navigator.userAgent.toLowerCase();
  const targetUrl = location.href;

  // 카카오톡
  if (userAgent.match(/kakaotalk/i)) {
    location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(targetUrl);
    return;
  }

  // 라인
  if (userAgent.match(/line/i)) {
    const separator = targetUrl.indexOf('?') !== -1 ? '&' : '?';
    location.href = targetUrl + separator + 'openExternalBrowser=1';
    return;
  }

  // 기타 인앱 브라우저
  const inAppPattern = /inapp|naver|snapchat|instagram|everytimeapp|whatsApp|electron|wadiz|aliapp|zumapp|iphone(.*)whale|android(.*)whale|kakaostory|band|twitter|DaumApps|DaumDevice\/mobile|FB_IAB|FB4A|FBAN|FBIOS|FBSS|trill|SamsungBrowser\/[^1]/i;

  if (userAgent.match(inAppPattern)) {
    // iOS - Safari 강제 실행 불가, 안내 페이지 표시
    if (userAgent.match(/iphone|ipad|ipod/i)) {
      document.body.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          text-align: center;
          background: #f5f5f5;
        ">
          <div style="
            background: white;
            padding: 32px;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            max-width: 400px;
          ">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2" style="margin-bottom: 16px;">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            <h2 style="margin: 0 0 12px; color: #333; font-size: 20px;">
              외부 브라우저에서 열어주세요
            </h2>
            <p style="margin: 0 0 24px; color: #666; font-size: 14px; line-height: 1.6;">
              인앱 브라우저에서는 Google 로그인이 지원되지 않습니다.<br>
              Safari에서 접속해주세요.
            </p>
            <button onclick="openSafari()" style="
              width: 100%;
              padding: 14px 24px;
              background: #1a73e8;
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
            ">
              Safari로 열기
            </button>
            <p style="margin: 16px 0 0; color: #999; font-size: 12px;">
              버튼을 누르면 URL이 복사됩니다.<br>
              Safari에서 주소창을 길게 눌러 붙여넣기 해주세요.
            </p>
          </div>
        </div>
      `;
      return;
    }

    // Android - Chrome Intent로 강제 실행
    location.href = 'intent://' + targetUrl.replace(/https?:\/\//i, '') + '#Intent;scheme=https;package=com.android.chrome;end';
  }
})();
