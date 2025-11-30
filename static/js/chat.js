document.addEventListener('DOMContentLoaded', () => {
    // DOM元素
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const emojiButton = document.getElementById('emoji-button');
    const emojiPicker = document.getElementById('emoji-picker');
    const usersList = document.getElementById('users-list');
    const userCount = document.getElementById('user-count');
    const toggleUsersButton = document.getElementById('toggle-users');
    const chatUsers = document.getElementById('chat-users');
    const logoutButton = document.getElementById('logout-button');
    const typingIndicator = document.getElementById('typing-indicator');
    const movieModal = document.getElementById('movie-modal');
    const moviePlayer = document.getElementById('movie-player');
    const closeMovieButton = document.getElementById('close-movie');
    
    // Socket.IO连接
    let socket;
    let typingTimeout;
    let isTyping = false;
    
    // 初始化WebSocket连接
    function initSocket() {
        // 连接到当前域名的Socket.IO服务器
        socket = io();
        
        // 连接成功
        socket.on('connect', () => {
            console.log('WebSocket连接成功');
            appendSystemMessage('连接成功，正在加入聊天室...');
            
            // 加入聊天室
            socket.emit('join', { nickname: nickname });
        });
        
        // 连接断开
        socket.on('disconnect', () => {
            console.log('WebSocket连接断开');
            appendSystemMessage('连接已断开，请刷新页面重试');
        });
        
        // 加入错误
        socket.on('join_error', (data) => {
            alert(data.message);
            window.location.href = '/';
        });
        
        // 欢迎消息
        socket.on('welcome', (data) => {
            appendSystemMessage(data.message);
            updateUsersList(data.users);
            
            // 显示功能使用提示
            setTimeout(() => {
                appendSystemMessage('🎉 功能使用提示：\n' +
                                   '• 使用@川小农召唤川农ai小助手\n' +
                                   '• 使用@用户名发送提醒消息\n' +
                                   '• 使用@电影+链接分享并观看电影\n' +
                                   '• 点击表情按钮插入emoji');
            }, 1000);
        });
        
        // 收到消息
        socket.on('message', (data) => {
            // 避免显示自己发送的消息（因为已经在本地显示了）
            if (data.nickname !== nickname) {
                appendMessage(data);
            }
        });
        
        // AI回复
        socket.on('ai_response', (data) => {
            appendSystemMessage(data.message);
        });
        
        // @消息
        socket.on('at_message', (data) => {
            appendMessage({
                nickname: data.from,
                message: `@${data.to} ${data.message}`,
                type: 'at_message'
            });
            // 可以在这里添加特别的提醒效果
        });
        
        // 电影链接
        socket.on('movie_link', (data) => {
            // 避免显示自己发送的电影链接（因为已经在本地显示了）
            if (data.nickname !== nickname) {
                appendMessage({
                    nickname: data.nickname,
                    message: '', // 清空消息文本，只显示iframe
                    type: 'movie_link',
                    url: data.url
                });
            }
        });
        
        // 用户加入
        socket.on('user_joined', (data) => {
            appendSystemMessage(`欢迎 ${data.nickname} 加入聊天室！`);
        });
        
        // 用户离开
        socket.on('user_left', (data) => {
            appendSystemMessage(`${data.nickname} 离开了聊天室`);
        });
        
        // 更新在线用户列表
        socket.on('update_users', (users) => {
            updateUsersList(users);
        });
        
        // 用户正在输入
        socket.on('user_typing', (data) => {
            showTypingIndicator(data.nickname);
        });
        
        // 用户停止输入
        socket.on('user_stop_typing', (data) => {
            hideTypingIndicator(data.nickname);
        });
    }
    
    // 添加系统消息
    function appendSystemMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'system-message';
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // 添加聊天消息
    function appendMessage(data) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${data.nickname === nickname ? 'own' : ''}`;
        
        const messageUser = document.createElement('div');
        messageUser.className = 'message-user';
        messageUser.textContent = data.nickname;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // 处理消息内容
        if (data.type === 'movie_link' && data.url) {
            // 只显示iframe，不显示额外的文本和播放按钮
            // 调整iframe容器样式，使其更好地适应内容
            const iframeContainer = document.createElement('div');
            iframeContainer.style.marginTop = '8px';
            iframeContainer.style.width = 'auto'; // 改为auto以适应内容
            iframeContainer.style.maxWidth = '400px'; // 保持最大宽度限制
            iframeContainer.style.position = 'relative';
            iframeContainer.style.display = 'inline-block'; // 改为inline-block以适应内容
            
            const iframe = document.createElement('iframe');
            const parsedUrl = `https://jx.m3u8.tv/jiexi/?url=${encodeURIComponent(data.url)}`;
            iframe.src = parsedUrl;
            iframe.style.width = '400px';
            iframe.style.height = '400px'; // 调整为400*400大小
            iframe.style.border = 'none';
            iframe.style.borderRadius = '8px';
            iframe.style.display = 'block';
            
            iframeContainer.appendChild(iframe);
            messageContent.appendChild(iframeContainer);
        } else if (data.type === 'at_message') {
            // 高亮@用户名
            let formattedMessage = data.message;
            if (formattedMessage.includes(`@${nickname}`)) {
                formattedMessage = formattedMessage.replace(
                    new RegExp(`@${nickname}`, 'g'),
                    `<span style="color: #1E88E5; font-weight: bold;">@${nickname}</span>`
                );
            }
            messageContent.innerHTML = formattedMessage;
        } else {
            messageContent.textContent = data.message;
        }
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        // 添加日期和时间显示
        const now = new Date();
        const dateStr = now.toLocaleDateString();
        const timeStr = now.toLocaleTimeString();
        messageTime.textContent = `${dateStr} ${timeStr}`;
        
        if (data.nickname !== nickname) {
            messageElement.appendChild(messageUser);
        }
        messageElement.appendChild(messageContent);
        messageElement.appendChild(messageTime);
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // 清除打字指示器
        hideAllTypingIndicators();
    }
    
    // 更新在线用户列表
    function updateUsersList(users) {
        usersList.innerHTML = '';
        userCount.textContent = users.length;
        
        users.forEach(user => {
            const li = document.createElement('li');
            
            const onlineIndicator = document.createElement('div');
            onlineIndicator.className = 'user-item-online';
            
            const userName = document.createElement('div');
            userName.className = 'user-item-name';
            userName.textContent = user;
            
            // 如果是当前用户，添加特殊标记
            if (user === nickname) {
                userName.textContent += ' (我)';
                userName.style.fontWeight = '600';
                userName.style.color = '#1E88E5';
            }
            
            li.appendChild(onlineIndicator);
            li.appendChild(userName);
            usersList.appendChild(li);
        });
    }
    
    // 发送消息
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;
        
        // 检测@电影功能
        const movieMatch = message.match(/^@电影\s+(https?:\/\/.+)$/i);
        if (movieMatch && movieMatch[1]) {
            const movieUrl = movieMatch[1];
            
            // 直接在本地创建电影链接消息
            appendMessage({
                nickname: nickname,
                message: '', // 清空消息文本，只显示iframe
                type: 'movie_link',
                url: movieUrl
            });
            
            // 同时发送到服务器供其他用户看到
            socket.emit('movie_link', {
                nickname: nickname,
                url: movieUrl
            });
        } else {
            // 直接在本地显示普通消息，确保用户能立即看到
            appendMessage({
                nickname: nickname,
                message: message,
                type: 'normal'
            });
            
            // 同时发送到服务器供其他用户看到
            socket.emit('send_message', {
                nickname: nickname,
                message: message
            });
        }
        
        // 清空输入框
        messageInput.value = '';
        
        // 停止输入状态
        stopTyping();
    }
    
    // 开始输入
    function startTyping() {
        if (!isTyping) {
            isTyping = true;
            socket.emit('typing', { nickname: nickname });
        }
        
        // 清除之前的定时器
        clearTimeout(typingTimeout);
        
        // 设置新的定时器，3秒后停止输入状态
        typingTimeout = setTimeout(() => {
            stopTyping();
        }, 3000);
    }
    
    // 停止输入
    function stopTyping() {
        if (isTyping) {
            isTyping = false;
            socket.emit('stop_typing', { nickname: nickname });
        }
        clearTimeout(typingTimeout);
    }
    
    // 显示打字指示器
    function showTypingIndicator(user) {
        if (user === nickname) return;
        
        typingIndicator.textContent = `${user} 正在输入...`;
        
        // 清除之前的定时器
        clearTimeout(typingTimeout);
        
        // 3秒后隐藏
        typingTimeout = setTimeout(() => {
            hideTypingIndicator(user);
        }, 3000);
    }
    
    // 隐藏特定用户的打字指示器
    function hideTypingIndicator(user) {
        if (typingIndicator.textContent.includes(user)) {
            typingIndicator.textContent = '';
        }
    }
    
    // 隐藏所有打字指示器
    function hideAllTypingIndicators() {
        typingIndicator.textContent = '';
    }
    
    // 打开电影播放器
    function openMoviePlayer(url) {
        // 使用解析地址处理电影URL
        const parsedUrl = `https://jx.m3u8.tv/jiexi/?url=${encodeURIComponent(url)}`;
        moviePlayer.src = parsedUrl;
        // 设置iframe大小为400*400
        moviePlayer.style.width = '400px';
        moviePlayer.style.height = '400px';
        movieModal.classList.add('active');
    }
    
    // 关闭电影播放器
    function closeMoviePlayer() {
        movieModal.classList.remove('active');
        moviePlayer.src = '';
    }
    
    // 插入emoji
    function insertEmoji(emoji) {
        const start = messageInput.selectionStart;
        const end = messageInput.selectionEnd;
        const text = messageInput.value;
        
        messageInput.value = text.substring(0, start) + emoji + text.substring(end);
        messageInput.focus();
        messageInput.selectionStart = messageInput.selectionEnd = start + emoji.length;
        
        // 触发输入事件
        messageInput.dispatchEvent(new Event('input'));
    }
    
    // 初始化事件监听
    function initEventListeners() {
        // 发送按钮点击
        sendButton.addEventListener('click', sendMessage);
        
        // 输入框回车发送
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // 输入事件（用于打字指示器）
        messageInput.addEventListener('input', startTyping);
        
        // 显示/隐藏emoji选择器
        emojiButton.addEventListener('click', () => {
            emojiPicker.classList.toggle('active');
        });
        
        // 点击页面其他地方关闭emoji选择器
        document.addEventListener('click', (e) => {
            if (!emojiButton.contains(e.target) && !emojiPicker.contains(e.target)) {
                emojiPicker.classList.remove('active');
            }
        });
        
        // 点击emoji插入
        const emojiList = emojiPicker.querySelector('.emoji-list');
        // 过滤掉空白emoji，只保留有效的emoji字符
        emojiList.innerHTML = emojiList.textContent.split(' ')
            .filter(emoji => emoji.trim().length > 0) // 过滤空白emoji
            .map(emoji => `<span class="emoji-item">${emoji}</span>`)
            .join('');
        
        document.querySelectorAll('.emoji-item').forEach(item => {
            item.addEventListener('click', () => {
                insertEmoji(item.textContent);
            });
        });
        
        // 切换用户列表
        toggleUsersButton.addEventListener('click', () => {
            chatUsers.classList.toggle('active');
        });
        
        // 退出登录
        logoutButton.addEventListener('click', () => {
            if (socket) {
                socket.disconnect();
            }
            window.location.href = '/';
        });
        
        // 电影播放器控制
        closeMovieButton.addEventListener('click', closeMoviePlayer);
        
        // 点击模态框背景关闭
        movieModal.addEventListener('click', (e) => {
            if (e.target === movieModal) {
                closeMoviePlayer();
            }
        });
        
        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && movieModal.classList.contains('active')) {
                closeMoviePlayer();
            }
        });
    }
    
    // 初始化应用
    function init() {
        initEventListeners();
        initSocket();
        
        // 自动聚焦输入框
        setTimeout(() => {
            messageInput.focus();
        }, 500);
    }
    
    // 启动应用
    init();
});