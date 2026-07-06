// script.js - 澧炲己鐗堬紙闆嗘垚Supabase浜戠瀛樺偍锛?
// ================================================
// 1. SUPABASE 閰嶇疆
// ================================================
// 璇锋浛鎹互涓嬪€间负鎮ㄧ殑Supabase椤圭洰淇℃伅
const SUPABASE_URL = 'https://owfyycgomqclytnswobj.supabase.co'; // 鏇挎崲涓烘偍鐨刄RL
const SUPABASE_ANON_KEY = 'sb_publishable_65fjjNxcUjAFpFJ3AEW9Tg_ctW41ZsV'; // 鏇挎崲涓烘偍鐨凙non Key

// 鍒涘缓Supabase瀹㈡埛绔紙鍐呴儴浣跨敤鍚嶄负 supabaseClient锛岄伩鍏嶄笌 SDK 瀵煎嚭鐨勫叏灞€鍙橀噺鍐茬獊锛?
let supabaseClient = null;
try {
    if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
        // window.supabase from CDN is the Supabase SDK which exposes createClient
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        // 鏆撮湶瀹㈡埛绔埌 window锛屽苟纭繚鍏ㄥ眬 `supabase` 鎸囧悜宸插垵濮嬪寲鐨?client锛堥伩鍏?SDK/Client 娣锋穯锛?
        try { window.supabaseClient = supabaseClient; } catch (e) { /* ignore */ }
        try { window.supabase = supabaseClient; } catch (e) { /* ignore */ }
        console.log('Supabase瀹㈡埛绔凡鍒濆鍖栧苟缁戝畾鍒?window.supabase');
    }
} catch (e) {
    console.warn('Supabase鍒濆鍖栧け璐ワ紝灏嗕娇鐢ㄧ函鏈湴妯″紡:', e);
}

// 纭繚瀛樺湪鍏ㄥ眬涓斿彲璁块棶鐨?`supabase` 鏍囪瘑锛岄伩鍏嶅叾浠栬剼鏈腑鐩存帴浣跨敤鏈畾涔夌殑 `supabase` 鎶涘嚭 ReferenceError
// 浼樺厛浣跨敤 CDN 鎻愪緵鐨勫叏灞€ `window.supabase`锛屽叾娆′娇鐢ㄦ湰鍦板垱寤虹殑 `supabaseClient`銆?
// 纭繚鏈湴鑴氭湰涓湁涓€涓彲鐢ㄧ殑 `supabase` 鍙橀噺锛屼紭鍏堟寚鍚戝凡鍒濆鍖栫殑 client
try {
    if (typeof window !== 'undefined' && window.supabase) {
        // window.supabase 宸茶鎴戜滑鍦ㄤ笂闈㈢粦瀹氫负 supabaseClient锛堣嫢鍙敤锛?
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
// 2. 鏍稿績鏁版嵁绠＄悊鍑芥暟锛堜簯绔紭鍏堬級
// ================================================

// 浠嶴upabase鍔犺浇鎵€鏈夌敤鎴锋暟鎹?
async function loadUsersFromSupabase() {
    if (!supabaseClient) {
        console.warn('Supabase鏈厤缃紝浣跨敤鏈湴鏁版嵁');
        return null;
    }
    
    try {
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('id', { ascending: true });
        
        if (error) {
            console.error('浠嶴upabase鍔犺浇鐢ㄦ埛澶辫触:', error);
            return null;
        }
        
        console.log(`浠嶴upabase鍔犺浇浜?${users.length} 涓敤鎴穈);
        return users;
    } catch (e) {
        console.error('缃戠粶鎴朣upabase閿欒:', e);
        return null;
    }
}

// 杞崲鏁版嵁搴撴牸寮忎负绋嬪簭鏍煎紡
function formatSupabaseUsers(supabaseUsers) {
    if (!supabaseUsers) return { loginUsers: {}, qsUsers: {} };
    
    const loginUsers = {};
    const qsUsers = {};
    
    supabaseUsers.forEach(user => {
        // 涓簂ogin_users鍑嗗鏁版嵁锛坮ole杞崲锛?user' -> 'member'锛?
        // use a normalized username key to avoid case mismatches across devices
        const usernameKey = (user.username || '').toString().trim().toLowerCase();
        const loginRole = user.role === 'user' ? 'member' : user.role;
        loginUsers[usernameKey] = {
            password: user.password,
            role: loginRole,
            name: user.name,
            department: user.department || '鏈垎閰?,
            team: user.team || '',
            position: user.position || ''
        };

        // 涓簈s_users_data鍑嗗鏁版嵁锛宬ey 鍚屾牱瑙勮寖鍖?
        qsUsers[usernameKey] = {
            id: user.id,
            name: user.name,
            password: user.password,
            role: user.role, // 娉ㄦ剰锛氫繚鎸佸師鏍?
            status: user.status || 'active',
            joinDate: user.join_date || '2023-01-01',
            notes: user.notes || '绯荤粺鐢ㄦ埛',
            department: user.department || '鏈垎閰?,
            team: user.team || '',
            position: user.position || ''
        };
    });
    
    return { loginUsers, qsUsers };
}

// 澧炲己鐗坙oadLoginUsers锛氫簯绔紭鍏?
async function loadLoginUsers() {
    console.log('寮€濮嬪姞杞界敤鎴锋暟鎹紙浜戠浼樺厛锛?..');
    
    // 浼樺寲锛氬鏋滄湰鍦板凡鏈夌紦瀛橈紝鍏堣繑鍥炵紦瀛樹互閬垮厤鍥犵綉缁滄垨浜戠寤惰繜瀵艰嚧鐧诲綍澶辫触
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

            // 鍚屾椂鍦ㄥ悗鍙板皾璇曞埛鏂颁簯绔暟鎹紙涓嶉樆濉炵櫥褰曪級
            if (supabaseClient) {
                loadUsersFromSupabase().then(supabaseUsers => {
                    if (supabaseUsers && supabaseUsers.length > 0) {
                        const { loginUsers, qsUsers } = formatSupabaseUsers(supabaseUsers);
                        localStorage.setItem('login_users', JSON.stringify(loginUsers));
                        localStorage.setItem('qs_users_data', JSON.stringify(qsUsers));
                        console.log('鍚庡彴宸插埛鏂颁簯绔敤鎴峰苟鏇存柊鏈湴缂撳瓨');
                    }
                }).catch(err => {
                    console.warn('鍚庡彴鍒锋柊浜戠鐢ㄦ埛澶辫触:', err);
                });
            } else {
                console.warn('Supabase鏈厤缃紝璺宠繃鍚庡彴鍒锋柊');
            }

            return parsed;
        } catch (e) {
            console.error('瑙ｆ瀽鏈湴鐢ㄦ埛缂撳瓨澶辫触锛岀Щ闄ょ紦瀛樺苟缁х画鍔犺浇:', e);
            localStorage.removeItem('login_users');
        }
    }

    // 1. 鏈湴娌℃湁缂撳瓨鏃讹紝棣栧厛灏濊瘯浠嶴upabase鍔犺浇锛堜簯绔紭鍏堬級
    const supabaseUsers = await loadUsersFromSupabase();

    if (supabaseUsers && supabaseUsers.length > 0) {
        // 浜戠鏁版嵁鍙敤
        const { loginUsers, qsUsers } = formatSupabaseUsers(supabaseUsers);

        // 鏇存柊鏈湴瀛樺偍浣滀负缂撳瓨锛坘eys 宸茶鑼冧负灏忓啓锛?
        localStorage.setItem('login_users', JSON.stringify(loginUsers));
        localStorage.setItem('qs_users_data', JSON.stringify(qsUsers));

        console.log('宸蹭娇鐢ㄤ簯绔暟鎹紝骞舵洿鏂颁簡鏈湴缂撳瓨');
        return loginUsers;
    }

    // 2. 浜戠涓嶅彲鐢紝鍥為€€鍒板師鏈夐€昏緫
    console.log('浜戠鏁版嵁涓嶅彲鐢紝浣跨敤鍘熸湁鏈湴閫昏緫');
    
    // 鍘熸湁閫昏緫锛堝凡绠€鍖栵紝鍙繚鐣欐牳蹇冮儴鍒嗭級
    const qsUsersData = localStorage.getItem('qs_users_data');
    const loginUsersStored = localStorage.getItem('login_users');
    
    // 濡傛灉涓や釜鏁版嵁婧愰兘鏈夋暟鎹紝纭繚瀹冧滑鍚屾
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
            
            // 鍚屾涓や釜鏁版嵁婧?
            const syncedLoginUsers = {};
            const syncedQsUsers = {};
            
            const allUsernames = new Set([
                ...Object.keys(qsUsers),
                ...Object.keys(loginUsers)
            ]);
            
            allUsernames.forEach(username => {
                if (qsUsers[username]) {
                    const user = qsUsers[username];
                    
                    // 鍚屾鍒皅s_users_data
                    syncedQsUsers[username] = {
                        ...user,
                        department: user.department || '鏈垎閰?,
                        team: user.team || '',
                        position: user.position || ''
                    };
                    
                    // 瑙掕壊鍚嶈浆鎹細'user' -> 'member'
                    const loginRole = user.role === 'user' ? 'member' : user.role;
                    
                    syncedLoginUsers[username] = {
                        password: user.password,
                        role: loginRole,
                        name: user.name || username,
                        department: user.department || '鏈垎閰?,
                        team: user.team || '',
                        position: user.position || ''
                    };
                    
                } else if (loginUsers[username]) {
                    const user = loginUsers[username];
                    
                    // 瑙掕壊鍚嶈浆鎹細'member' -> 'user'
                    const qsRole = user.role === 'member' ? 'user' : user.role;
                    
                    syncedQsUsers[username] = {
                        id: Date.now() + Math.random(),
                        name: user.name || username,
                        password: user.password,
                        role: qsRole,
                        status: 'active',
                        joinDate: new Date().toISOString().split('T')[0],
                        notes: '浠巐ogin_users鍚屾',
                        department: user.department || '鏈垎閰?,
                        team: user.team || '',
                        position: user.position || ''
                    };
                    
                    syncedLoginUsers[username] = {
                        password: user.password,
                        role: user.role,
                        name: user.name || username,
                        department: user.department || '鏈垎閰?,
                        team: user.team || '',
                        position: user.position || ''
                    };
                }
            });
            
            // 淇濆瓨鍚屾鍚庣殑鏁版嵁
            localStorage.setItem('login_users', JSON.stringify(syncedLoginUsers));
            localStorage.setItem('qs_users_data', JSON.stringify(syncedQsUsers));
            
            return syncedLoginUsers;
            
        } catch (e) {
            console.error('鍚屾鐢ㄦ埛鏁版嵁澶辫触:', e);
        }
    }
    
    // 3. 濡傛灉鏈湴涔熸病鏈夋暟鎹紝鍒涘缓榛樿鐢ㄦ埛
    console.log('鍒涘缓榛樿鐢ㄦ埛鏁版嵁');
    
    const defaultUsers = {
        'ophelia': { 
            password: 'qsam137', 
            role: 'admin', 
            name: 'Ophelia',
            department: '绠＄悊灞?,
            team: '',
            position: ''
        },
        '003绔?: { 
            password: 'zhu0902', 
            role: 'member', 
            name: '003绔?,
            department: '鎴樻枟缃?,
            team: '鐗规畩鏀跺缁?,
            position: '闃熷憳'
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
            notes: '绯荤粺绠＄悊鍛?,
            department: '绠＄悊灞?,
            team: '',
            position: ''
        },
        '003绔?: { 
            id: 2,
            name: '003绔?, 
            password: 'zhu0902', 
            role: 'user',
            status: 'active', 
            joinDate: '2023-02-15', 
            notes: '鏅€氭垚鍛?,
            department: '鎴樻枟缃?,
            team: '鐗规畩鏀跺缁?,
            position: '闃熷憳'
        }
    };
    localStorage.setItem('qs_users_data', JSON.stringify(defaultQsUsers));
    
    console.log('榛樿鐢ㄦ埛鍒涘缓瀹屾垚');
    return defaultUsers;
}

// ================================================
// 3. 浜戠鏁版嵁鍚屾鍑芥暟
// ================================================

// 鍚屾鏈湴鏁版嵁鍒癝upabase
async function syncLocalToSupabase() {
    if (!supabaseClient) {
        console.warn('Supabase鏈厤缃紝璺宠繃鍚屾');
        return false;
    }
    
    const qsUsersData = localStorage.getItem('qs_users_data');
    if (!qsUsersData) return false;
    
    try {
        const localUsers = JSON.parse(qsUsersData);
        const usernames = Object.keys(localUsers);
        
        console.log(`寮€濮嬪悓姝?${usernames.length} 涓敤鎴峰埌Supabase...`);
        
        // 鑾峰彇浜戠鐜版湁鐢ㄦ埛
        const { data: cloudUsers } = await supabaseClient
            .from('users')
            .select('username');
        
        const cloudUsernames = cloudUsers ? cloudUsers.map(u => u.username) : [];
        
        // 鎵惧嚭闇€瑕佹坊鍔犵殑鐢ㄦ埛
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
                    department: user.department || '鏈垎閰?,
                    team: user.team || '',
                    position: user.position || '',
                    join_date: user.joinDate || new Date().toISOString().split('T')[0],
                    notes: user.notes || '浠庢湰鍦板悓姝?
                });
            }
        }
        
        // 鎵归噺鎻掑叆
        if (usersToAdd.length > 0) {
            const { error } = await supabase
                .from('users')
                .insert(usersToAdd);
            
            if (error) throw error;
            console.log(`鎴愬姛鍚屾浜?${usersToAdd.length} 涓敤鎴峰埌浜戠`);
        } else {
            console.log('鏈湴涓庝簯绔暟鎹凡鍚屾锛屾棤闇€鏇存柊');
        }
        
        return true;
    } catch (error) {
        console.error('鍚屾鍒癝upabase澶辫触:', error);
        return false;
    }
}

// 妫€娴嬪苟澶勭悊鏁版嵁鍐茬獊
async function handleDataConflict() {
    if (!supabaseClient) return false;
    
    try {
        // 鑾峰彇浜戠鏁版嵁
        const cloudUsers = await loadUsersFromSupabase();
        if (!cloudUsers) return false;
        
        // 鑾峰彇鏈湴鏁版嵁
        const localData = localStorage.getItem('qs_users_data');
        if (!localData) return false;
        
        const localUsers = JSON.parse(localData);
        
        // 绠€鍗曠瓥鐣ワ細浠ヤ簯绔暟鎹负鍑?
        const { loginUsers, qsUsers } = formatSupabaseUsers(cloudUsers);
        
        localStorage.setItem('login_users', JSON.stringify(loginUsers));
        localStorage.setItem('qs_users_data', JSON.stringify(qsUsers));
        
        console.log('宸蹭娇鐢ㄤ簯绔暟鎹鐩栨湰鍦版暟鎹紙瑙ｅ喅鍐茬獊锛?);
        return true;
    } catch (error) {
        console.error('澶勭悊鏁版嵁鍐茬獊澶辫触:', error);
        return false;
    }
}

// ================================================
// 4. 椤甸潰鍔犺浇瀹屾垚鍚庣殑鍒濆鍖?
// ================================================

// 椤甸潰鍔犺浇瀹屾垚
document.addEventListener('DOMContentLoaded', function() {
    console.log('椤甸潰鍔犺浇瀹屾垚锛屽紑濮嬪垵濮嬪寲鐢ㄦ埛鏁版嵁');
    
    // 妫€鏌upabase閰嶇疆
    if (!SUPABASE_URL.includes('your-project-id') && !SUPABASE_ANON_KEY.includes('your-anon-key')) {
        console.log('Supabase閰嶇疆妫€娴嬮€氳繃');
    } else {
        console.warn('鈿狅笍 璇峰厛閰嶇疆Supabase URL鍜孉non Key锛?);
    }
    
    // 鏁版嵁涓€鑷存€ф鏌ワ紙鍘熸湁鍑芥暟锛?
    checkDataConsistency();
    
    // 鍒濆鍖栫敤鎴锋暟鎹紝浼樺厛灏濊瘯浜戠
    const initPromise = loadLoginUsers();
    
    // 寮€灞忓姩鐢?
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
    
    // 鐧诲綍琛ㄥ崟鎻愪氦
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
    }
    
    // 娓稿鐧诲綍
    const guestLoginBtn = document.getElementById('guestLogin');
    if (guestLoginBtn) {
        guestLoginBtn.addEventListener('click', function() {
            handleGuestLogin();
        });
    }
    
    // 鎸塃nter閿彁浜?
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
    
    // 娣诲姞璋冭瘯鎸夐挳锛堜粎鍦ㄥ紑鍙戞椂浣跨敤锛?
    addDebugButtons();
    
    // 鍒濆鍖栧悗灏濊瘯鍚屾鏁版嵁
    initPromise.then(() => {
        // 寤惰繜鎵ц鍚屾锛岄伩鍏嶅奖鍝嶉〉闈㈠姞杞?
        setTimeout(() => {
            syncLocalToSupabase().then(success => {
                if (success) {
                    console.log('鏁版嵁鍚屾瀹屾垚');
                }
            });
        }, 5000);
    });
});

// ================================================
// 5. 鍘熸湁鍑芥暟淇濇寔涓嶅彉锛屽彧娣诲姞浜戠鏀寔
// ================================================

// 鏁版嵁涓€鑷存€ф鏌ワ紙淇濇寔涓嶅彉锛?
function checkDataConsistency() {
    console.log('寮€濮嬫暟鎹竴鑷存€ф鏌?..');
    // ... 鍘熸湁浠ｇ爜淇濇寔涓嶅彉 ...
}

// 澶勭悊鐧诲綍锛堟敼涓哄紓姝ワ級
async function handleLogin() {
    const rawUsername = document.getElementById('username').value || '';
    const username = rawUsername.toString().trim();
    const password = document.getElementById('password').value;
    
    console.log('鐧诲綍灏濊瘯:', username);
    
    // 娓呴櫎涔嬪墠鐨勯敊璇彁绀?
    clearErrors();
    
    if (!username || !password) {
        showError('璇疯緭鍏ョ敤鎴峰悕鍜屽瘑鐮?);
        return;
    }
    
    try {
        // 鍔犺浇鐢ㄦ埛鏁版嵁锛堢瓑寰呭紓姝ュ畬鎴愶級
        const users = await loadLoginUsers();
        
        // 妯℃嫙鏈嶅姟鍣ㄩ獙璇?
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
                console.log('鎵惧埌鐢ㄦ埛:', user);

                if ((user.password || '') === password) {
                    console.log('瀵嗙爜楠岃瘉鎴愬姛');
                    // use the canonical username key for storing session
                    const sessionName = (user.username || username).toString().trim() || username;
                    loginSuccess(sessionName, user.role || 'member');
                } else {
                    console.log('瀵嗙爜閿欒');
                    showError('瀵嗙爜閿欒');
                }
            } else {
                console.log('鐢ㄦ埛涓嶅瓨鍦?);
                showError('鐢ㄦ埛涓嶅瓨鍦?);
            }
        }, 500);
    } catch (error) {
        console.error('鐧诲綍杩囩▼涓嚭閿?', error);
        showError('鐧诲綍澶辫触锛岃閲嶈瘯');
    }
}

// 澶勭悊娓稿鐧诲綍锛堜繚鎸佷笉鍙橈級
function handleGuestLogin() {
    console.log('娓稿鐧诲綍');
    
    // 娓呴櫎杈撳叆
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    
    // 妯℃嫙鐧诲綍杩囩▼
    const resetLoading = showLoading('姝ｅ湪杩涘叆娓稿妯″紡...');
    
    setTimeout(() => {
        loginSuccess('guest', 'guest');
        if (resetLoading) resetLoading();
    }, 1000);
}

// 鐧诲綍鎴愬姛锛堜繚鎸佷笉鍙橈級
function loginSuccess(username, role, displayName) {
    console.log('鐧诲綍鎴愬姛:', { username, role, displayName });

    // canonicalize username storage key (lowercase trimmed) to match cached keys
    const canonical = (username || '').toString().trim().toLowerCase();

    // 淇濆瓨鐧诲綍鐘舵€佸埌鏈湴瀛樺偍
    localStorage.setItem('auth_user', canonical);
    localStorage.setItem('auth_user_name', displayName || username || canonical);
    localStorage.setItem('auth_role', role);
    localStorage.setItem('auth_time', new Date().toISOString());
    
    // 鏍规嵁瑙掕壊璺宠浆鍒颁笉鍚岄〉闈?
    let redirectUrl = 'member.html'; // 榛樿
    
    switch(role) {
        case 'admin':
            redirectUrl = 'admin.html';
            break;
        case 'member':
        case 'user': // 鍏煎鏅€氭垚鍛?
            redirectUrl = 'member.html';
            break;
        case 'viewer':
            redirectUrl = 'viewer.html';
            break;
        case 'guest':
            redirectUrl = 'guest.html';
            break;
    }
    
    console.log('璺宠浆鍒?', redirectUrl);
    window.location.href = redirectUrl;
}

// 鏄剧ず閿欒淇℃伅锛堜繚鎸佷笉鍙橈級
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

// 娓呴櫎閿欒淇℃伅锛堜繚鎸佷笉鍙橈級
function clearErrors() {
    const errors = document.querySelectorAll('.error-message');
    errors.forEach(error => error.remove());
}

// 鏄剧ず鍔犺浇鐘舵€侊紙淇濇寔涓嶅彉锛?
function showLoading(message) {
    const submitBtn = document.querySelector('.btn-login');
    const guestBtn = document.querySelector('.btn-guest');
    
    if (!submitBtn || !guestBtn) return null;
    
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message || '鐧诲綍涓?..'}`;
    submitBtn.disabled = true;
    guestBtn.disabled = true;
    
    return function() {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        guestBtn.disabled = false;
    };
}

// 璋冭瘯宸ュ叿锛堜繚鎸佷笉鍙橈級
function addDebugButtons() {
    // 鍙湪鏈湴寮€鍙戠幆澧冧腑娣诲姞璋冭瘯鎸夐挳
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
            <button onclick="debugShowUsers()" style="margin: 5px; padding: 5px;">鏄剧ず鐢ㄦ埛</button>
            <button onclick="debugClearData()" style="margin: 5px; padding: 5px;">娓呴櫎鏁版嵁</button>
            <button onclick="debugSyncData()" style="margin: 5px; padding: 5px;">鍚屾鏁版嵁</button>
            <button onclick="debugTestSupabase()" style="margin: 5px; padding: 5px;">娴嬭瘯Supabase</button>
        `;
        
        document.body.appendChild(debugDiv);
    }
}

// 璋冭瘯鍑芥暟锛氭樉绀哄綋鍓嶆墍鏈夌敤鎴?
function debugShowUsers() {
    const qsUsersData = localStorage.getItem('qs_users_data');
    const loginUsersData = localStorage.getItem('login_users');
    
    console.log('=== 璋冭瘯淇℃伅 ===');
    console.log('qs_users_data:', qsUsersData ? JSON.parse(qsUsersData) : '绌?);
    console.log('login_users:', loginUsersData ? JSON.parse(loginUsersData) : '绌?);
    
    alert(`鐢ㄦ埛鏁版嵁宸茶緭鍑哄埌鎺у埗鍙癨nqs_users_data: ${qsUsersData ? Object.keys(JSON.parse(qsUsersData)).length : 0} 涓敤鎴穃nlogin_users: ${loginUsersData ? Object.keys(JSON.parse(loginUsersData)).length : 0} 涓敤鎴穈);
}

// 璋冭瘯鍑芥暟锛氭竻闄ゆ墍鏈夋暟鎹?
function debugClearData() {
    if (confirm('纭畾瑕佹竻闄ゆ墍鏈夌敤鎴锋暟鎹悧锛?)) {
        localStorage.removeItem('qs_users_data');
        localStorage.removeItem('login_users');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_role');
        localStorage.removeItem('auth_time');
        alert('鏁版嵁宸叉竻闄わ紝椤甸潰灏嗗埛鏂?);
        location.reload();
    }
}

// 璋冭瘯鍑芥暟锛氬己鍒跺悓姝ユ暟鎹?
function debugSyncData() {
    console.log('寮哄埗鍚屾鏁版嵁...');
    syncLocalToSupabase().then(success => {
        alert(`鏁版嵁鍚屾${success ? '鎴愬姛' : '澶辫触'}锛岃鏌ョ湅鎺у埗鍙拌緭鍑篳);
    });
}

// 鏂板锛氭祴璇昐upabase杩炴帴
function debugTestSupabase() {
    if (!supabaseClient) {
        alert('Supabase鏈厤缃垨鍒濆鍖栧け璐?);
        return;
    }
    
    alert('寮€濮嬫祴璇昐upabase杩炴帴...');
    
    loadUsersFromSupabase().then(users => {
        if (users) {
            alert(`Supabase杩炴帴鎴愬姛锛乗n鑾峰彇鍒?${users.length} 涓敤鎴穈);
        } else {
            alert('Supabase杩炴帴澶辫触锛岃妫€鏌ラ厤缃拰缃戠粶');
        }
    });
}

// ================================================
// 6. 鎻愪緵缁欏叾浠栭〉闈娇鐢ㄧ殑鍏ㄥ眬鍑芥暟
// ================================================

// 鎻愪緵缁檓embers.html浣跨敤鐨勭敤鎴风鐞嗗嚱鏁?
window.supabaseHelpers = {
    // 娣诲姞鐢ㄦ埛鍒癝upabase
    async addUserToSupabase(userData) {
        if (!supabaseClient) {
            console.warn('Supabase鏈厤缃紝淇濆瓨鍒版湰鍦?);
            return { success: false, message: 'Supabase鏈厤缃? };
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
                    department: userData.department || '鏈垎閰?,
                    team: userData.team || '',
                    position: userData.position || '',
                    join_date: userData.joinDate || new Date().toISOString().split('T')[0],
                    notes: userData.notes || '绯荤粺鐢ㄦ埛'
                }])
                .select();
            
            if (error) throw error;
            
            console.log('鐢ㄦ埛宸叉坊鍔犲埌Supabase:', data[0]);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('娣诲姞鐢ㄦ埛鍒癝upabase澶辫触:', error);
            return { success: false, message: error.message };
        }
    },
    
    // 鏇存柊Supabase涓殑鐢ㄦ埛
    async updateUserInSupabase(userId, userData) {
        if (!supabaseClient) {
            console.warn('Supabase鏈厤缃紝鏇存柊鏈湴鏁版嵁');
            return { success: false, message: 'Supabase鏈厤缃? };
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
            
            console.log('鐢ㄦ埛宸插湪Supabase鏇存柊:', data[0]);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('鏇存柊Supabase鐢ㄦ埛澶辫触:', error);
            return { success: false, message: error.message };
        }
    },
    
    // 浠嶴upabase鍒犻櫎鐢ㄦ埛
    async deleteUserFromSupabase(userId) {
        if (!supabaseClient) {
            console.warn('Supabase鏈厤缃紝鍒犻櫎鏈湴鏁版嵁');
            return { success: false, message: 'Supabase鏈厤缃? };
        }
        
        try {
            const { error } = await supabaseClient
                .from('users')
                .delete()
                .eq('id', userId);
            
            if (error) throw error;
            
            console.log('鐢ㄦ埛宸蹭粠Supabase鍒犻櫎:', userId);
            return { success: true };
        } catch (error) {
            console.error('浠嶴upabase鍒犻櫎鐢ㄦ埛澶辫触:', error);
            return { success: false, message: error.message };
        }
    },
    
    // 淇濆瓨鎴愬憳璇︽儏鍒癝upabase
    async saveMemberDetailToSupabase(memberDetail) {
        if (!supabaseClient) {
            console.warn('Supabase鏈厤缃紝淇濆瓨鍒版湰鍦?);
            return { success: false, message: 'Supabase鏈厤缃? };
        }
        
        try {
            // 妫€鏌ユ槸鍚﹀凡瀛樺湪
            const { data: existing } = await supabaseClient
                .from('member_details')
                .select('id')
                .eq('username', memberDetail.username)
                .single();
            
            let result;
            
            if (existing) {
                // 鏇存柊鐜版湁璁板綍
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
                // 鎻掑叆鏂拌褰?
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
            
            console.log('鎴愬憳璇︽儏宸蹭繚瀛樺埌Supabase:', result);
            return { success: true, data: result };
        } catch (error) {
            console.error('淇濆瓨鎴愬憳璇︽儏鍒癝upabase澶辫触:', error);
            return { success: false, message: error.message };
        }
    },
    
    // 浠嶴upabase鍔犺浇鎴愬憳璇︽儏
    async loadMemberDetailFromSupabase(username) {
        if (!supabase) {
            console.warn('Supabase鏈厤缃紝浠庢湰鍦板姞杞?);
            return null;
        }
        
        try {
            const { data, error } = await supabase
                .from('member_details')
                .select('*')
                .eq('username', username)
                .single();
            
            if (error) {
                // 濡傛灉娌℃湁鎵惧埌锛岃繑鍥瀗ull鑰屼笉鏄姏鍑洪敊璇?
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error('浠嶴upabase鍔犺浇鎴愬憳璇︽儏澶辫触:', error);
            return null;
        }
    },
    
    // 浠嶴upabase鍔犺浇鎵€鏈夌敤鎴?
    async loadAllUsersFromSupabase() {
        return await loadUsersFromSupabase();
    },
    
    // 鑾峰彇浜戠鐘舵€?
    async getCloudSyncStatus() {
        if (!supabase) {
            return { connected: false, message: 'Supabase鏈厤缃? };
        }
        
        try {
            // 娴嬭瘯杩炴帴
            const { error } = await supabase
                .from('member_details')
                .select('count')
                .limit(1);
            
            if (error) {
                return { connected: false, message: error.message };
            }
            
            return { connected: true, message: '浜戠杩炴帴姝ｅ父' };
        } catch (e) {
            return { connected: false, message: e.message };
        }
    },
    
    // 鑾峰彇Supabase瀹㈡埛绔姸鎬?
    getSupabaseStatus() {
        return {
            configured: !!(SUPABASE_URL && SUPABASE_ANON_KEY),
            initialized: !!supabase,
            url: SUPABASE_URL,
            hasValidConfig: !!(
                SUPABASE_URL &&
                SUPABASE_ANON_KEY &&
                SUPABASE_URL.startsWith('https://') &&
                SUPABASE_URL.includes('.supabase.co') &&
                SUPABASE_ANON_KEY.startsWith('sb_publishable_')
            )
        };
    }
};
