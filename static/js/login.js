document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const nicknameInput = document.getElementById('nickname');
    const nicknameStatus = document.getElementById('nickname-status');
    const loginButton = document.getElementById('login-button');
    
    let debounceTimer;
    
    // 昵称实时验证
    nicknameInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const nickname = nicknameInput.value.trim();
        
        if (nickname.length === 0) {
            nicknameStatus.textContent = '请输入昵称';
            nicknameStatus.style.color = '#757575';
            loginButton.disabled = true;
            return;
        }
        
        if (nickname.length < 2 || nickname.length > 20) {
            nicknameStatus.textContent = '昵称长度应在2-20个字符之间';
            nicknameStatus.style.color = '#c62828';
            loginButton.disabled = true;
            return;
        }
        
        // 防抖检查昵称是否已存在
        debounceTimer = setTimeout(() => {
            fetch(`/check_nickname?nickname=${encodeURIComponent(nickname)}`)
                .then(response => response.json())
                .then(data => {
                    if (data.available) {
                        nicknameStatus.textContent = '昵称可用';
                        nicknameStatus.style.color = '#2e7d32';
                        loginButton.disabled = false;
                    } else {
                        nicknameStatus.textContent = '昵称已被使用';
                        nicknameStatus.style.color = '#c62828';
                        loginButton.disabled = true;
                    }
                })
                .catch(error => {
                    console.error('检查昵称时出错:', error);
                    nicknameStatus.textContent = '网络错误，请稍后重试';
                    nicknameStatus.style.color = '#c62828';
                    loginButton.disabled = true;
                });
        }, 300);
    });
    
    // 表单提交
    loginForm.addEventListener('submit', (e) => {
        const nickname = nicknameInput.value.trim();
        
        if (nickname.length < 2 || nickname.length > 20) {
            e.preventDefault();
            nicknameStatus.textContent = '昵称长度应在2-20个字符之间';
            nicknameStatus.style.color = '#c62828';
            return;
        }
        
        // 防止重复提交
        loginButton.disabled = true;
        loginButton.textContent = '加入中...';
    });
    
    // 初始禁用登录按钮
    loginButton.disabled = true;
});