// script.js - 增强版（集成Supabase云端存储）
// ================================================
// 1. SUPABASE 配置
// ================================================
// 请替换以下值为您的Supabase项目信息
const SUPABASE_URL = 'https://owfyycgomqclytnswobj.supabase.co'; // 替换为您的URL
const SUPABASE_ANON_KEY = 'sb_publishable_65fjjNxcUjAFpFJ3AEW9Tg_ctW41ZsV'; // 替换为您的Anon Key

// 创建Supabase客户端（内部使用名为 supabaseClient，避免与 SDK 导出的全局变量冲突）
let supabaseClient = null;
try {
    if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
        // window.supabase from CDN is the Supabase SDK which exposes createClient
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        // 暴露客户端到 window，并确保全局 `supabase` 指向已初始化的 client（避免 SDK/Client 混淆）
        try { window.supabaseClient = supabaseClient; } catch (e) { /* ignore */ }
        try { window.supabase = supabaseClient; } catch (e) { /* ignore */ }
        console.log('Supabase客户端已初始化并绑定到 window.supabase');
    }
} catch (e) {
    console.warn('Supabase初始化失败，将使用纯本地模式:', e);
}

// 确保存在全局且可访问的 `supabase` 标识，避免其他脚本中直接使用未定义的 `supabase` 抛出 ReferenceError
// 优先使用 CDN 提供的全局 `window.supabase`，其次使用本地创建的 `supabaseClient`。
// 确保本地脚本中有一个可用的 `supabase` 变量，优先指向已初始化的 client
try {
    if (typeof window !== 'undefined' && window.supabase) {
        // window.supabase 已被我们在上面绑定为 supabaseClient（若可用）
        var supabase = window.supabase;
    } else if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        var supabase = supabaseClient;
        try { if (typeof window !== 'undefined') window.supabase = supabaseClient; } catch (e) { /* ignore */ }
    } else {
        var supabase = null;
    }
} catch (e) {
    var supabase = (typeof supabaseClient !== 'undefined') ? supabaseClient : null;
}

// ================================================
// 2. 核心数据管理函数（云端优先）
// ================================================

// 从Supabase加载所有用户数据
async function loadUsersFromSupabase() {
    if (!supabaseClient) {
        console.warn('Supabase未配置，使用本地数据');
        return null;
    }
    
    try {
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('id', { ascending: true });
        
        if (error) {
            console.error('从Supabase加载用户失败:', error);
            return null;
        }
        
        console.log(`从Supabase加载了 ${users.length} 个用户`);
        return users;
    } catch (e) {
        console.error('网络或Supabase错误:', e);
        return null;
    }
}

// 转换数据库格式为程序格式
function formatSupabaseUsers(supabaseUsers) {
    if (!supabaseUsers) return { loginUsers: {}, qsUsers: {} };
    
    const loginUsers = {};
    const qsUsers = {};
    
    supabaseUsers.forEach(user => {
        // 为login_users准备数据（role转换：'user' -> 'member'）
        // use a normalized username key to avoid case mismatches across devices
        const usernameKey = (user.username || '').toString().trim().toLowerCase();
        const loginRole = user.role === 'user' ? 'member' : user.role;
        loginUsers[usernameKey] = {
            password: user.password,
            role: loginRole,
            name: user.name,
            department: user.department || '未分配',
            team: user.team || '',
            position: user.position || ''
        };

        // 为qs_users_data准备数据，key 同样规范化
        qsUsers[usernameKey] = {
            id: user.id,
            name: user.name,
            password: user.password,
            role: user.role, // 注意：保持原样
            status: user.status || 'active',
            joinDate: user.join_date || '2023-01-01',
            notes: user.notes || '系统用户',
            department: user.department || '未分配',
            team: user.team || '',
            position: user.position || ''
        };
    });
    
    return { loginUsers, qsUsers };
}

// 增强版loadLoginUsers：云端优先
async function loadLoginUsers() {
    console.log('开始加载用户数据（云端优先）...');
    
    // 优化：如果本地已有缓存，先返回缓存以避免因网络或云端延迟导致登录失败
    const loginUsersCached = localStorage.getItem('login_users');
    if (loginUsersCached) {
        try {
            let parsed = JSON.parse(loginUsersCached);
            // normalize cached keys to lowercase
            const normalized = {};
            Object.keys(parsed || {}).forEach(k => {
                const key = (k || '').toString().trim().toLowerCase();
                normalized[key] = parsed[k];
            });
            parsed = normalized;

            // 同时在后台尝试刷新云端数据（不阻塞登录）
            if (supabaseClient) {
                loadUsersFromSupabase().then(supabaseUsers => {
                    if (supabaseUsers && supabaseUsers.length > 0) {
                        const { loginUsers, qsUsers } = formatSupabaseUsers(supabaseUsers);
                        localStorage.setItem('login_users', JSON.stringify(loginUsers));
                        localStorage.setItem('qs_users_data', JSON.stringify(qsUsers));
                        console.log('后台已刷新云端用户并更新本地缓存');
                    }
                }).catch(err => {
                    console.warn('后台刷新云端用户失败:', err);
                });
            } else {
                console.warn('Supabase未配置，跳过后台刷新');
            }

            return parsed;
        } catch (e) {
            console.error('解析本地用户缓存失败，移除缓存并继续加载:', e);
            localStorage.removeItem('login_users');
        }
    }

    // 1. 本地没有缓存时，首先尝试从Supabase加载（云端优先）
    const supabaseUsers = await loadUsersFromSupabase();

    if (supabaseUsers && supabaseUsers.length > 0) {
        // 云端数据可用
        const { loginUsers, qsUsers } = formatSupabaseUsers(supabaseUsers);

        // 更新本地存储作为缓存（keys 已规范为小写）
        localStorage.setItem('login_users', JSON.stringify(loginUsers));
        localStorage.setItem('qs_users_data', JSON.stringify(qsUsers));

        console.log('已使用云端数据，并更新了本地缓存');
        return loginUsers;
    }

    // 2. 云端不可用，回退到原有逻辑
    console.log('云端数据不可用，使用原有本地逻辑');
    
    // 原有逻辑（已简化，只保留核心部分）
    const qsUsersData = localStorage.getItem('qs_users_data');
    const loginUsersStored = localStorage.getItem('login_users');
    
    // 如果两个数据源都有数据，确保它们同步
    if (qsUsersData && loginUsersStored) {
        try {
            // parse and normalize both datasets to lowercased keys
            const rawQsUsers = JSON.parse(qsUsersData || '{}');
            const rawLoginUsers = JSON.parse(loginUsersStored || '{}');
            const qsUsers = {};
            const loginUsers = {};

            Object.keys(rawQsUsers).forEach(k => {
                const key = (k || '').toString().trim().toLowerCase();
                qsUsers[key] = rawQsUsers[k];
            });
            Object.keys(rawLoginUsers).forEach(k => {
                const key = (k || '').toString().trim().toLowerCase();
                loginUsers[key] = rawLoginUsers[k];
            });
            
            // 同步两个数据源
            const syncedLoginUsers = {};
            const syncedQsUsers = {};
            
            const allUsernames = new Set([
                ...Object.keys(qsUsers),
                ...Object.keys(loginUsers)
            ]);
            
            allUsernames.forEach(username => {
                if (qsUsers[username]) {
                    const user = qsUsers[username];
                    
                    // 同步到qs_users_data
                    syncedQsUsers[username] = {
                        ...user,
                        department: user.department || '未分配',
                        team: user.team || '',
                        position: user.position || ''
                    };
                    
                    // 角色名转换：'user' -> 'member'
                    const loginRole = user.role === 'user' ? 'member' : user.role;
                    
                    syncedLoginUsers[username] = {
                        password: user.password,
                        role: loginRole,
                        name: user.name || username,
                        department: user.department || '未分配',
                        team: user.team || '',
                        position: user.position || ''
                    };
                    
                } else if (loginUsers[username]) {
                    const user = loginUsers[username];
                    
                    // 角色名转换：'member' -> 'user'
                    const qsRole = user.role === 'member' ? 'user' : user.role;
                    
                    syncedQsUsers[username] = {
                        id: Date.now() + Math.random(),
                        name: user.name || username,
                        password: user.password,
                        role: qsRole,
                        status: 'active',
                        joinDate: new Date().toISOString().split('T')[0],
                        notes: '从login_users同步',
                        department: user.department || '未分配',
                        team: user.team || '',
                        position: user.position || ''
                    };
                    
                    syncedLoginUsers[username] = {
                        password: user.password,
                        role: user.role,
                        name: user.name || username,
                        department: user.department || '未分配',
                        team: user.team || '',
                        position: user.position || ''
                    };
                }
            });
            
            // 保存同步后的数据
            localStorage.setItem('login_users', JSON.stringify(syncedLoginUsers));
            localStorage.setItem('qs_users_data', JSON.stringify(syncedQsUsers));
            
            return syncedLoginUsers;
            
        } catch (e) {
            console.error('同步用户数据失败:', e);
        }
    }
    
    // 3. 如果本地也没有数据，创建默认用户
    console.log('创建默认用户数据');
    
    const defaultUsers = {
        'ophelia': { 
            password: 'qsam137', 
            role: 'admin', 
            name: 'Ophelia',
            department: '管理层',
            team: '',
            position: ''
        },
        '003竺': { 
            password: 'zhu0902', 
            role: 'member', 
            name: '003竺',
            department: '战斗署',
            team: '特殊收容组',
            position: '队员'
        }
    };
    
    localStorage.setItem('login_users', JSON.stringify(defaultUsers));
    
    const defaultQsUsers = {
        'ophelia': { 
            id: 1,
            name: 'Ophelia', 
            password: 'qsam137', 
            role: 'admin', 
            status: 'active', 
            joinDate: '2023-01-01', 
            notes: '系统管理员',
            department: '管理层',
            team: '',
            position: ''
        },
        '003竺': { 
            id: 2,
            name: '003竺', 
            password: 'zhu0902', 
            role: 'user',
            status: 'active', 
            joinDate: '2023-02-15', 
            notes: '普通成员',
            department: '战斗署',
            team: '特殊收容组',
            position: '队员'
        }
    };
    localStorage.setItem('qs_users_data', JSON.stringify(defaultQsUsers));
    
    console.log('默认用户创建完成');
    return defaultUsers;
}

// ================================================
// 3. 云端数据同步函数
// ================================================

// 同步本地数据到Supabase
async function syncLocalToSupabase() {
    if (!supabaseClient) {
        console.warn('Supabase未配置，跳过同步');
        return false;
    }
    
    const qsUsersData = localStorage.getItem('qs_users_data');
    if (!qsUsersData) return false;
    
    try {
        const localUsers = JSON.parse(qsUsersData);
        const usernames = Object.keys(localUsers);
        
        console.log(`开始同步 ${usernames.length} 个用户到Supabase...`);
        
        // 获取云端现有用户
        const { data: cloudUsers } = await supabaseClient
            .from('users')
            .select('username');
        
        const cloudUsernames = cloudUsers ? cloudUsers.map(u => u.username) : [];
        
        // 找出需要添加的用户
        const usersToAdd = [];
        
        for (const username of usernames) {
            if (!cloudUsernames.includes(username)) {
                const user = localUsers[username];
                usersToAdd.push({
                    username: username,
                    name: user.name,
                    password: user.password,
                    role: user.role,
                    status: user.status || 'active',
                    department: user.department || '未分配',
                    team: user.team || '',
                    position: user.position || '',
                    join_date: user.joinDate || new Date().toISOString().split('T')[0],
                    notes: user.notes || '从本地同步'
                });
            }
        }
        
        // 批量插入
        if (usersToAdd.length > 0) {
            const { error } = await supabase
                .from('users')
                .insert(usersToAdd);
            
            if (error) throw error;
            console.log(`成功同步了 ${usersToAdd.length} 个用户到云端`);
        } else {
            console.log('本地与云端数据已同步，无需更新');
        }
        
        return true;
    } catch (error) {
        console.error('同步到Supabase失败:', error);
        return false;
    }
}

// 检测并处理数据冲突
async function handleDataConflict() {
    if (!supabaseClient) return false;
    
    try {
        // 获取云端数据
        const cloudUsers = await loadUsersFromSupabase();
        if (!cloudUsers) return false;
        
        // 获取本地数据
        const localData = localStorage.getItem('qs_users_data');
        if (!localData) return false;
        
        const localUsers = JSON.parse(localData);
        
        // 简单策略：以云端数据为准
        const { loginUsers, qsUsers } = formatSupabaseUsers(cloudUsers);
        
        localStorage.setItem('login_users', JSON.stringify(loginUsers));
        localStorage.setItem('qs_users_data', JSON.stringify(qsUsers));
        
        console.log('已使用云端数据覆盖本地数据（解决冲突）');
        return true;
    } catch (error) {
        console.error('处理数据冲突失败:', error);
        return false;
    }
}

// ================================================
// 4. 页面加载完成后的初始化
// ================================================

// 页面加载完成
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，开始初始化用户数据');
    
    // 检查Supabase配置
    if (!SUPABASE_URL.includes('your-project-id') && !SUPABASE_ANON_KEY.includes('your-anon-key')) {
        console.log('Supabase配置检测通过');
    } else {
        console.warn('⚠️ 请先配置Supabase URL和Anon Key！');
    }
    
    // 数据一致性检查（原有函数）
    checkDataConsistency();
    
    // 初始化用户数据，优先尝试云端
    const initPromise = loadLoginUsers();
    
    // 开屏动画
    setTimeout(() => {
        const splashScreen = document.getElementById('splashScreen');
        const loginContainer = document.getElementById('loginContainer');
        const welcomeText = document.getElementById('welcomeText');
        
        if (welcomeText) {
            welcomeText.style.opacity = '0';
            welcomeText.style.transition = 'opacity 1s ease';
        }
        
        setTimeout(() => {
            if (splashScreen) {
                splashScreen.style.opacity = '0';
                splashScreen.style.transition = 'opacity 1s ease';
            }
            
            setTimeout(() => {
                if (splashScreen) splashScreen.style.display = 'none';
                if (loginContainer) {
                    loginContainer.style.display = 'block';
                    
                    setTimeout(() => {
                        loginContainer.style.opacity = '1';
                        loginContainer.style.transform = 'translateY(0)';
                    }, 100);
                }
            }, 1000);
        }, 1500);
    }, 3000);
    
    // 登录表单提交
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
    }
    
    // 游客登录
    const guestLoginBtn = document.getElementById('guestLogin');
    if (guestLoginBtn) {
        guestLoginBtn.addEventListener('click', function() {
            handleGuestLogin();
        });
    }
    
    // 按Enter键提交
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
    
    // 添加调试按钮（仅在开发时使用）
    addDebugButtons();
    
    // 初始化后尝试同步数据
    initPromise.then(() => {
        // 延迟执行同步，避免影响页面加载
        setTimeout(() => {
            syncLocalToSupabase().then(success => {
                if (success) {
                    console.log('数据同步完成');
                }
            });
        }, 5000);
    });
});

// ================================================
// 5. 原有函数保持不变，只添加云端支持
// ================================================

// 数据一致性检查（保持不变）
function checkDataConsistency() {
    console.log('开始数据一致性检查...');
    // ... 原有代码保持不变 ...
}

// 处理登录（改为异步）
async function handleLogin() {
    const rawUsername = document.getElementById('username').value || '';
    const username = rawUsername.toString().trim();
    const password = document.getElementById('password').value;
    
    console.log('登录尝试:', username);
    
    // 清除之前的错误提示
    clearErrors();
    
    if (!username || !password) {
        showError('请输入用户名和密码');
        return;
    }
    
    try {
        // 加载用户数据（等待异步完成）
        const users = await loadLoginUsers();
        
        // 模拟服务器验证
        setTimeout(() => {
            // normalize lookup key
            const key = username.toLowerCase();
            let user = (users && users[key]) || null;

            // fallback: try original raw username (in case some data wasn't normalized)
            if (!user && users && users[username]) user = users[username];

            // last fallback: check qs_users_data (may contain user records)
            if (!user) {
                try {
                    const qs = JSON.parse(localStorage.getItem('qs_users_data') || '{}');
                    const k1 = username;
                    const k2 = username.toLowerCase();
                    if (qs[k1]) user = qs[k1];
                    else if (qs[k2]) user = qs[k2];
                } catch (e) {
                    // ignore parse errors
                }
            }

            if (user) {
                console.log('找到用户:', user);

                if ((user.password || '') === password) {
                    console.log('密码验证成功');
                    // use the canonical username key for storing session
                    const sessionName = (user.username || username).toString().trim() || username;
                    loginSuccess(sessionName, user.role || 'member');
                } else {
                    console.log('密码错误');
                    showError('密码错误');
                }
            } else {
                console.log('用户不存在');
                showError('用户不存在');
            }
        }, 500);
    } catch (error) {
        console.error('登录过程中出错:', error);
        showError('登录失败，请重试');
    }
}

// 处理游客登录（保持不变）
function handleGuestLogin() {
    console.log('游客登录');
    
    // 清除输入
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    
    // 模拟登录过程
    const resetLoading = showLoading('正在进入游客模式...');
    
    setTimeout(() => {
        loginSuccess('guest', 'guest');
        if (resetLoading) resetLoading();
    }, 1000);
}

// 登录成功（保持不变）
function loginSuccess(username, role, displayName) {
    console.log('登录成功:', { username, role, displayName });

    // canonicalize username storage key (lowercase trimmed) to match cached keys
    const canonical = (username || '').toString().trim().toLowerCase();

    // 保存登录状态到本地存储
    localStorage.setItem('auth_user', canonical);
    localStorage.setItem('auth_user_name', displayName || username || canonical);
    localStorage.setItem('auth_role', role);
    localStorage.setItem('auth_time', new Date().toISOString());
    
    // 根据角色跳转到不同页面
    let redirectUrl = 'member.html'; // 默认
    
    switch(role) {
        case 'admin':
            redirectUrl = 'admin.html';
            break;
        case 'member':
        case 'user': // 兼容普通成员
            redirectUrl = 'member.html';
            break;
        case 'viewer':
            redirectUrl = 'viewer.html';
            break;
        case 'guest':
            redirectUrl = 'guest.html';
            break;
    }
    
    console.log('跳转到:', redirectUrl);
    window.location.href = redirectUrl;
}

// 显示错误信息（保持不变）
function showError(message) {
    clearErrors();
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    errorDiv.style.cssText = `
        color: #ff6b6b;
        background: rgba(255, 0, 0, 0.1);
        padding: 12px;
        border-radius: 8px;
        margin-top: 15px;
        text-align: center;
        border: 1px solid rgba(255, 0, 0, 0.3);
        animation: fadeInUp 0.5s ease;
    `;
    
    const form = document.getElementById('loginForm');
    if (form) form.appendChild(errorDiv);
}

// 清除错误信息（保持不变）
function clearErrors() {
    const errors = document.querySelectorAll('.error-message');
    errors.forEach(error => error.remove());
}

// 显示加载状态（保持不变）
function showLoading(message) {
    const submitBtn = document.querySelector('.btn-login');
    const guestBtn = document.querySelector('.btn-guest');
    
    if (!submitBtn || !guestBtn) return null;
    
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message || '登录中...'}`;
    submitBtn.disabled = true;
    guestBtn.disabled = true;
    
    return function() {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        guestBtn.disabled = false;
    };
}

// 调试工具（保持不变）
function addDebugButtons() {
    // 只在本地开发环境中添加调试按钮
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const debugDiv = document.createElement('div');
        debugDiv.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            z-index: 9999;
            background: rgba(0,0,0,0.8);
            padding: 10px;
            border-radius: 5px;
        `;
        
        debugDiv.innerHTML = `
            <button onclick="debugShowUsers()" style="margin: 5px; padding: 5px;">显示用户</button>
            <button onclick="debugClearData()" style="margin: 5px; padding: 5px;">清除数据</button>
            <button onclick="debugSyncData()" style="margin: 5px; padding: 5px;">同步数据</button>
            <button onclick="debugTestSupabase()" style="margin: 5px; padding: 5px;">测试Supabase</button>
        `;
        
        document.body.appendChild(debugDiv);
    }
}

// 调试函数：显示当前所有用户
function debugShowUsers() {
    const qsUsersData = localStorage.getItem('qs_users_data');
    const loginUsersData = localStorage.getItem('login_users');
    
    console.log('=== 调试信息 ===');
    console.log('qs_users_data:', qsUsersData ? JSON.parse(qsUsersData) : '空');
    console.log('login_users:', loginUsersData ? JSON.parse(loginUsersData) : '空');
    
    alert(`用户数据已输出到控制台\nqs_users_data: ${qsUsersData ? Object.keys(JSON.parse(qsUsersData)).length : 0} 个用户\nlogin_users: ${loginUsersData ? Object.keys(JSON.parse(loginUsersData)).length : 0} 个用户`);
}

// 调试函数：清除所有数据
function debugClearData() {
    if (confirm('确定要清除所有用户数据吗？')) {
        localStorage.removeItem('qs_users_data');
        localStorage.removeItem('login_users');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_role');
        localStorage.removeItem('auth_time');
        alert('数据已清除，页面将刷新');
        location.reload();
    }
}

// 调试函数：强制同步数据
function debugSyncData() {
    console.log('强制同步数据...');
    syncLocalToSupabase().then(success => {
        alert(`数据同步${success ? '成功' : '失败'}，请查看控制台输出`);
    });
}

// 新增：测试Supabase连接
function debugTestSupabase() {
    if (!supabaseClient) {
        alert('Supabase未配置或初始化失败');
        return;
    }
    
    alert('开始测试Supabase连接...');
    
    loadUsersFromSupabase().then(users => {
        if (users) {
            alert(`Supabase连接成功！\n获取到 ${users.length} 个用户`);
        } else {
            alert('Supabase连接失败，请检查配置和网络');
        }
    });
}

// ================================================
// 6. 提供给其他页面使用的全局函数
// ================================================

// 提供给members.html使用的用户管理函数
window.supabaseHelpers = {
    // 添加用户到Supabase
    async addUserToSupabase(userData) {
        if (!supabaseClient) {
            console.warn('Supabase未配置，保存到本地');
            return { success: false, message: 'Supabase未配置' };
        }
        
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .insert([{
                    username: userData.username,
                    name: userData.name,
                    password: userData.password,
                    role: userData.role,
                    status: userData.status || 'active',
                    department: userData.department || '未分配',
                    team: userData.team || '',
                    position: userData.position || '',
                    join_date: userData.joinDate || new Date().toISOString().split('T')[0],
                    notes: userData.notes || '系统用户'
                }])
                .select();
            
            if (error) throw error;
            
            console.log('用户已添加到Supabase:', data[0]);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('添加用户到Supabase失败:', error);
            return { success: false, message: error.message };
        }
    },
    
    // 更新Supabase中的用户
    async updateUserInSupabase(userId, userData) {
        if (!supabaseClient) {
            console.warn('Supabase未配置，更新本地数据');
            return { success: false, message: 'Supabase未配置' };
        }
        
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .update({
                    username: userData.username,
                    name: userData.name,
                    password: userData.password,
                    role: userData.role,
                    status: userData.status,
                    department: userData.department,
                    team: userData.team,
                    position: userData.position,
                    notes: userData.notes
                })
                .eq('id', userId)
                .select();
            
            if (error) throw error;
            
            console.log('用户已在Supabase更新:', data[0]);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('更新Supabase用户失败:', error);
            return { success: false, message: error.message };
        }
    },
    
    // 从Supabase删除用户
    async deleteUserFromSupabase(userId) {
        if (!supabaseClient) {
            console.warn('Supabase未配置，删除本地数据');
            return { success: false, message: 'Supabase未配置' };
        }
        
        try {
            const { error } = await supabaseClient
                .from('users')
                .delete()
                .eq('id', userId);
            
            if (error) throw error;
            
            console.log('用户已从Supabase删除:', userId);
            return { success: true };
        } catch (error) {
            console.error('从Supabase删除用户失败:', error);
            return { success: false, message: error.message };
        }
    },
    
    // 保存成员详情到Supabase
    async saveMemberDetailToSupabase(memberDetail) {
        if (!supabaseClient) {
            console.warn('Supabase未配置，保存到本地');
            return { success: false, message: 'Supabase未配置' };
        }
        
        try {
            // 检查是否已存在
            const { data: existing } = await supabaseClient
                .from('member_details')
                .select('id')
                .eq('username', memberDetail.username)
                .single();
            
            let result;
            
            if (existing) {
                // 更新现有记录
                const { data, error } = await supabase
                    .from('member_details')
                    .update({
                        name: memberDetail.name,
                        photo_url: memberDetail.photo,
                        height: memberDetail.height,
                        gender: memberDetail.gender,
                        age: memberDetail.age,
                        attributes: memberDetail.attributes,
                        meme: memberDetail.meme,
                        meme_name: memberDetail.memeName,
                        ability: memberDetail.ability,
                        weapon: memberDetail.weapon,
                        department: memberDetail.department,
                        team: memberDetail.team,
                        position: memberDetail.position,
                        other: memberDetail.other,
                        updated_at: new Date().toISOString()
                    })
                    .eq('username', memberDetail.username)
                    .select();
                
                if (error) throw error;
                result = data[0];
            } else {
                // 插入新记录
                const { data, error } = await supabase
                    .from('member_details')
                    .insert([{
                        username: memberDetail.username,
                        name: memberDetail.name,
                        photo_url: memberDetail.photo,
                        height: memberDetail.height,
                        gender: memberDetail.gender,
                        age: memberDetail.age,
                        attributes: memberDetail.attributes,
                        meme: memberDetail.meme,
                        meme_name: memberDetail.memeName,
                        ability: memberDetail.ability,
                        weapon: memberDetail.weapon,
                        department: memberDetail.department,
                        team: memberDetail.team,
                        position: memberDetail.position,
                        other: memberDetail.other
                    }])
                    .select();
                
                if (error) throw error;
                result = data[0];
            }
            
            console.log('成员详情已保存到Supabase:', result);
            return { success: true, data: result };
        } catch (error) {
            console.error('保存成员详情到Supabase失败:', error);
            return { success: false, message: error.message };
        }
    },
    
    // 从Supabase加载成员详情
    async loadMemberDetailFromSupabase(username) {
        if (!supabase) {
            console.warn('Supabase未配置，从本地加载');
            return null;
        }
        
        try {
            const { data, error } = await supabase
                .from('member_details')
                .select('*')
                .eq('username', username)
                .single();
            
            if (error) {
                // 如果没有找到，返回null而不是抛出错误
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error('从Supabase加载成员详情失败:', error);
            return null;
        }
    },
    
    // 从Supabase加载所有用户
    async loadAllUsersFromSupabase() {
        return await loadUsersFromSupabase();
    },
    
    // 获取云端状态
    async getCloudSyncStatus() {
        if (!supabase) {
            return { connected: false, message: 'Supabase未配置' };
        }
        
        try {
            // 测试连接
            const { error } = await supabase
                .from('member_details')
                .select('count')
                .limit(1);
            
            if (error) {
                return { connected: false, message: error.message };
            }
            
            return { connected: true, message: '云端连接正常' };
        } catch (e) {
            return { connected: false, message: e.message };
        }
    },
    
    // 获取Supabase客户端状态
    getSupabaseStatus() {
        return {
            configured: !!(SUPABASE_URL && SUPABASE_ANON_KEY),
            initialized: !!supabase,
            url: SUPABASE_URL,
            hasValidConfig: !SUPABASE_URL.includes('https://owfyycgomqclytnswobj.supabase.co') && !SUPABASE_ANON_KEY.includes('sb_publishable_65fjjNxcUjAFpFJ3AEW9Tg_ctW41ZsV')
        };
    }
};