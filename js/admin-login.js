(function () {
    'use strict';

    var auth = window.GCInfoAuth;
    var dashboard = window.GCInfoAdminDashboard;
    var authView = document.getElementById('auth-view');
    var loginForm = document.getElementById('login-form');
    var emailInput = document.getElementById('email');
    var loginButton = document.getElementById('login-button');
    var loginMessage = document.getElementById('login-message');
    var setupNotice = document.getElementById('setup-notice');
    var accountPanel = document.getElementById('account-panel');
    var accountEmail = document.getElementById('account-email');
    var accountRole = document.getElementById('account-role');
    var roleMessage = document.getElementById('role-message');
    var logoutButton = document.getElementById('logout-button');
    var accessRequestForm = document.getElementById('access-request-form');
    var accessRequestName = document.getElementById('access-request-name');
    var accessRequestOrganization = document.getElementById('access-request-organization');
    var accessRequestPosition = document.getElementById('access-request-position');
    var accessRequestButton = document.getElementById('access-request-button');
    var renderSequence = 0;

    var roleLabels = {
        viewer: '等待授权 / Viewer',
        editor: '编辑者 / Editor',
        admin: '管理员 / Administrator'
    };

    var roleMessages = {
        viewer: '你的账号已通过交大邮箱验证，但尚未获得编辑权限。请等待管理员审核。',
        editor: '你已获得编辑权限，可以管理自己创建的内容。',
        admin: '你拥有管理员权限，可以管理全部内容和用户授权。'
    };

    function showMessage(message, type) {
        loginMessage.textContent = message;
        loginMessage.className = 'notice' + (type ? ' notice--' + type : '');
        loginMessage.hidden = false;
    }

    function hideMessage() {
        loginMessage.hidden = true;
        loginMessage.textContent = '';
    }

    function setLoading(isLoading) {
        loginButton.disabled = isLoading;
        loginButton.textContent = isLoading
            ? '正在发送… / Sending…'
            : '发送登录链接 / Send link';
    }

    async function renderSession(session) {
        var sequence = ++renderSequence;

        if (!session || !session.user) {
            if (dashboard) dashboard.close();
            authView.hidden = false;
            loginForm.hidden = false;
            accountPanel.hidden = true;
            accessRequestForm.hidden = true;
            return;
        }

        try {
            var profile = await auth.getProfile(session.user.id);
            if (sequence !== renderSequence) return;

            accountEmail.textContent = profile.email || session.user.email;
            accountRole.textContent = roleLabels[profile.role] || profile.role;
            roleMessage.textContent = roleMessages[profile.role] || '当前账户状态未知，请联系管理员。';
            accessRequestName.value = profile.display_name || '';
            accessRequestOrganization.value = profile.access_request_organization || '';
            accessRequestPosition.value = profile.access_request_position || '';
            accessRequestForm.hidden = profile.role !== 'viewer';
            loginForm.hidden = true;
            hideMessage();

            if ((profile.role === 'editor' || profile.role === 'admin') && dashboard) {
                accountPanel.hidden = true;
                authView.hidden = true;
                dashboard.open(session, profile, { onSignOut: handleSignOut });
            } else {
                if (dashboard) dashboard.close();
                authView.hidden = false;
                accountPanel.hidden = false;
            }
        } catch (error) {
            if (sequence !== renderSequence) return;
            showMessage('已登录，但无法读取权限信息。请确认数据库迁移已经完成。', 'error');
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();
        hideMessage();

        var email = auth.normalizeEmail(emailInput.value);
        if (!auth.isAllowedEmail(email)) {
            showMessage('请输入有效的上海交通大学邮箱。', 'error');
            emailInput.focus();
            return;
        }

        setLoading(true);
        try {
            await auth.sendMagicLink(email);
            showMessage('登录链接已发送，请前往邮箱查收。新用户登录后需等待管理员授予编辑权限。');
        } catch (error) {
            showMessage(error.message || '登录链接发送失败，请稍后重试。', 'error');
        } finally {
            setLoading(false);
        }
    }

    async function handleAccessRequestSubmit(event) {
        event.preventDefault();
        hideMessage();

        var displayName = accessRequestName.value.trim();
        var organization = accessRequestOrganization.value.trim();
        var position = accessRequestPosition.value.trim();
        if (!displayName) {
            showMessage('请填写真实姓名。', 'error');
            accessRequestName.focus();
            return;
        }
        if (!organization || organization.length > 120) {
            showMessage('请填写所属学生组织，且不要超过 120 个字符。', 'error');
            accessRequestOrganization.focus();
            return;
        }
        if (!position || position.length > 120) {
            showMessage('请填写职务，且不要超过 120 个字符。', 'error');
            accessRequestPosition.focus();
            return;
        }

        accessRequestButton.disabled = true;
        accessRequestButton.textContent = '正在提交… / Submitting…';
        try {
            await auth.submitAccessRequest(displayName, organization, position);
            showMessage('申请信息已提交。管理员现在可以看到你的姓名、所属学生组织和职务。');
            roleMessage.textContent = '申请已提交，请等待管理员审核。你可以在获得权限前更新申请信息。';
        } catch (error) {
            showMessage(error.message || '申请提交失败，请稍后重试。', 'error');
        } finally {
            accessRequestButton.disabled = false;
            accessRequestButton.textContent = '提交或更新申请 / Submit or update';
        }
    }

    async function handleSignOut() {
        logoutButton.disabled = true;
        try {
            await auth.signOut();
            if (dashboard) dashboard.close();
            await renderSession(null);
            showMessage('已退出当前设备上的登录。');
        } catch (error) {
            showMessage(error.message || '退出失败，请稍后重试。', 'error');
        } finally {
            logoutButton.disabled = false;
        }
    }

    async function initialize() {
        if (!auth || !auth.isConfigured()) {
            setupNotice.hidden = false;
            loginForm.hidden = true;
            return;
        }

        loginForm.addEventListener('submit', handleSubmit);
        accessRequestForm.addEventListener('submit', handleAccessRequestSubmit);
        logoutButton.addEventListener('click', handleSignOut);

        auth.onAuthStateChange(function (_event, session) {
            renderSession(session);
        });

        try {
            var session = await auth.getSession();
            await renderSession(session);
        } catch (error) {
            showMessage('登录状态读取失败，请刷新页面后重试。', 'error');
        }
    }

    initialize();
})();
