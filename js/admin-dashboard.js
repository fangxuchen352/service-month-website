(function () {
    'use strict';

    var data = window.GCInfoAdminData;
    var translation = window.GCInfoTranslation;
    var workspace = document.getElementById('management-workspace');
    var workspaceEmail = document.getElementById('workspace-email');
    var workspaceRole = document.getElementById('workspace-role');
    var workspaceMessage = document.getElementById('workspace-message');
    var logoutButton = document.getElementById('workspace-logout');
    var importButton = document.getElementById('import-legacy-button');
    var newEventButton = document.getElementById('new-event-button');
    var newResourceButton = document.getElementById('new-resource-button');
    var dialog = document.getElementById('content-dialog');
    var form = document.getElementById('content-form');
    var formMessage = document.getElementById('form-message');
    var saveButton = document.getElementById('content-save-button');
    var translateZhEnButton = document.getElementById('translate-zh-en');
    var translateEnZhButton = document.getElementById('translate-en-zh');
    var translationStatus = document.getElementById('translation-status');
    var translationReview = document.getElementById('translation-review');
    var translationConfirmed = document.getElementById('translation-confirmed');
    var state = {
        session: null,
        profile: null,
        categories: [],
        events: [],
        resources: [],
        profiles: [],
        currentView: 'events',
        onSignOut: null,
        loadSequence: 0,
        translationPendingReview: false
    };

    var roleLabels = {
        editor: '编辑者 / Editor',
        admin: '管理员 / Administrator'
    };

    var statusLabels = {
        published: '已发布 / Published',
        draft: '草稿 / Draft',
        archived: '已归档 / Archived'
    };

    function showWorkspaceMessage(message, type) {
        workspaceMessage.textContent = message;
        workspaceMessage.className = 'notice workspace-notice' + (type ? ' notice--' + type : '');
        workspaceMessage.hidden = false;
    }

    function hideWorkspaceMessage() {
        workspaceMessage.hidden = true;
        workspaceMessage.textContent = '';
    }

    function showFormMessage(message) {
        formMessage.textContent = message;
        formMessage.hidden = false;
    }

    function hideFormMessage() {
        formMessage.textContent = '';
        formMessage.hidden = true;
    }

    function setTranslationStatus(message, type) {
        translationStatus.textContent = message;
        translationStatus.className = 'translation-status' + (type ? ' translation-status--' + type : '');
    }

    function resetTranslationState() {
        state.translationPendingReview = false;
        translationConfirmed.checked = false;
        translationReview.hidden = true;
        setTranslationStatus('翻译供应商将在 Supabase 后端配置，密钥不会发送到浏览器。');
    }

    function getCategory(categoryId) {
        return state.categories.find(function (category) { return category.id === categoryId; });
    }

    function getOwnerEmail(ownerId) {
        if (state.profile && ownerId === state.profile.id) return state.profile.email;
        var owner = state.profiles.find(function (profile) { return profile.id === ownerId; });
        return owner ? owner.email : ownerId;
    }

    function formatDate(value, includeTime) {
        if (!value) return '—';
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return new Intl.DateTimeFormat('zh-CN', includeTime
            ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
            : { year: 'numeric', month: 'short', day: 'numeric' }
        ).format(date);
    }

    function createTextElement(tag, className, text) {
        var element = document.createElement(tag);
        if (className) element.className = className;
        element.textContent = text;
        return element;
    }

    function createEmptyState(message) {
        return createTextElement('div', 'empty-state', message);
    }

    function createActionButton(label, action, kind, id, isDanger) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = isDanger ? 'danger-button' : 'button-secondary';
        button.textContent = label;
        button.dataset.contentAction = action;
        button.dataset.contentKind = kind;
        button.dataset.contentId = id;
        return button;
    }

    function createContentCard(kind, item, isTrash) {
        var card = document.createElement('article');
        var header = document.createElement('div');
        var titles = document.createElement('div');
        var status = createTextElement(
            'span',
            'status-badge status-badge--' + item.status,
            statusLabels[item.status] || item.status
        );
        var meta = document.createElement('div');
        var actions = document.createElement('div');
        var category = getCategory(item.category_id);
        var titleZh = kind === 'event' ? item.title_zh : item.name_zh;
        var titleEn = kind === 'event' ? item.title_en : item.name_en;

        card.className = 'content-card';
        header.className = 'content-card-header';
        titles.appendChild(createTextElement('h3', '', titleZh));
        titles.appendChild(createTextElement('p', 'content-english-title', titleEn));
        header.appendChild(titles);
        header.appendChild(status);

        meta.className = 'content-card-meta';
        meta.appendChild(createTextElement(
            'span',
            '',
            '分类 / Category: ' + (category ? category.name_zh + ' / ' + category.name_en : '—')
        ));

        if (kind === 'event') {
            meta.appendChild(createTextElement('span', '', '时间 / Time: ' + formatDate(item.start_at, !item.all_day)));
            meta.appendChild(createTextElement('span', '', '地点 / Location: ' + item.location_zh + ' / ' + item.location_en));
        } else {
            meta.appendChild(createTextElement('span', '', '链接 / URL: ' + (item.url || '草稿暂未填写 / Not set')));
            meta.appendChild(createTextElement('span', '', '排序 / Sort order: ' + item.sort_order));
        }

        if (state.profile.role === 'admin') {
            meta.appendChild(createTextElement('span', '', '创建者 / Owner: ' + getOwnerEmail(item.created_by)));
        }

        actions.className = 'content-actions';
        if (isTrash) {
            var purgeAt = new Date(item.deleted_at).getTime() + 30 * 24 * 60 * 60 * 1000;
            var daysLeft = Math.max(0, Math.ceil((purgeAt - Date.now()) / (24 * 60 * 60 * 1000)));
            meta.appendChild(createTextElement(
                'span',
                '',
                '已删除 / Deleted: ' + formatDate(item.deleted_at, true) + '（预计剩余 ' + daysLeft + ' 天）'
            ));
            if (state.profile.role === 'admin') {
                actions.appendChild(createActionButton('恢复 / Restore', 'restore', kind, item.id, false));
            } else {
                actions.appendChild(createTextElement('span', 'content-english-title', '等待管理员恢复 / Administrator restore required'));
            }
        } else {
            actions.appendChild(createActionButton('编辑 / Edit', 'edit', kind, item.id, false));
            actions.appendChild(createActionButton('移入回收站 / Trash', 'trash', kind, item.id, true));
        }

        card.appendChild(header);
        card.appendChild(meta);
        card.appendChild(actions);
        return card;
    }

    function renderContentList(kind) {
        var items = kind === 'event' ? state.events : state.resources;
        var list = document.getElementById(kind === 'event' ? 'events-list' : 'resources-list');
        var count = document.getElementById(kind === 'event' ? 'events-count' : 'resources-count');
        var activeItems = items.filter(function (item) { return !item.deleted_at; });

        list.replaceChildren();
        count.textContent = activeItems.length;
        if (!activeItems.length) {
            list.appendChild(createEmptyState(kind === 'event'
                ? '还没有可管理的活动 / No manageable events yet.'
                : '还没有可管理的资源 / No manageable resources yet.'));
            return;
        }

        activeItems.forEach(function (item) {
            list.appendChild(createContentCard(kind, item, false));
        });
    }

    function renderTrash() {
        var list = document.getElementById('trash-list');
        var deleted = state.events
            .filter(function (item) { return item.deleted_at; })
            .map(function (item) { return { kind: 'event', item: item }; })
            .concat(state.resources
                .filter(function (item) { return item.deleted_at; })
                .map(function (item) { return { kind: 'resource', item: item }; }))
            .sort(function (left, right) {
                return new Date(right.item.deleted_at) - new Date(left.item.deleted_at);
            });

        list.replaceChildren();
        document.getElementById('trash-count').textContent = deleted.length;
        if (!deleted.length) {
            list.appendChild(createEmptyState('回收站是空的 / Trash is empty.'));
            return;
        }

        deleted.forEach(function (entry) {
            var card = createContentCard(entry.kind, entry.item, true);
            var kindLabel = createTextElement(
                'span',
                'content-kind',
                entry.kind === 'event' ? '活动 / Event' : '资源 / Resource'
            );
            card.insertBefore(kindLabel, card.firstChild);
            list.appendChild(card);
        });
    }

    function createRoleOption(value, label, selected) {
        var option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.selected = selected;
        return option;
    }

    function renderProfiles() {
        var list = document.getElementById('users-list');
        list.replaceChildren();
        document.getElementById('users-count').textContent = state.profiles.length;

        if (!state.profiles.length) {
            list.appendChild(createEmptyState('暂无用户 / No users found.'));
            return;
        }

        state.profiles.forEach(function (profile) {
            var card = document.createElement('article');
            var identity = document.createElement('div');
            var roleForm = document.createElement('div');
            var select = document.createElement('select');
            var button = document.createElement('button');
            var isCurrentUser = profile.id === state.profile.id;

            card.className = 'user-card';
            identity.appendChild(createTextElement('h3', '', profile.email));
            identity.appendChild(createTextElement(
                'p',
                '',
                isCurrentUser
                    ? '当前账户；请由另一位管理员更改其权限。'
                    : '注册时间 / Joined: ' + formatDate(profile.created_at, false)
            ));

            roleForm.className = 'user-role-form';
            select.setAttribute('aria-label', profile.email + ' role');
            select.appendChild(createRoleOption('viewer', '浏览者 / Viewer', profile.role === 'viewer'));
            select.appendChild(createRoleOption('editor', '编辑者 / Editor', profile.role === 'editor'));
            select.appendChild(createRoleOption('admin', '管理员 / Administrator', profile.role === 'admin'));
            select.disabled = isCurrentUser;
            select.dataset.profileRole = profile.id;

            button.type = 'button';
            button.className = 'button-secondary';
            button.textContent = '保存权限 / Save';
            button.dataset.saveRole = profile.id;
            button.disabled = isCurrentUser;
            roleForm.appendChild(select);
            roleForm.appendChild(button);
            card.appendChild(identity);
            card.appendChild(roleForm);
            list.appendChild(card);
        });
    }

    function renderAll() {
        renderContentList('event');
        renderContentList('resource');
        renderTrash();
        if (state.profile.role === 'admin') renderProfiles();
    }

    function setLoadingState() {
        ['events-list', 'resources-list', 'trash-list', 'users-list'].forEach(function (id) {
            var list = document.getElementById(id);
            list.replaceChildren(createEmptyState('正在加载… / Loading…'));
        });
    }

    async function loadWorkspace() {
        var sequence = ++state.loadSequence;
        setLoadingState();

        try {
            var result = await data.loadWorkspace(state.profile);
            if (sequence !== state.loadSequence) return;
            state.categories = result.categories;
            state.events = result.events;
            state.resources = result.resources;
            state.profiles = result.profiles;
            renderAll();
        } catch (error) {
            if (sequence !== state.loadSequence) return;
            showWorkspaceMessage(error.message || '内容读取失败，请稍后重试。', 'error');
        }
    }

    function switchView(view) {
        if (view === 'users' && state.profile.role !== 'admin') return;
        state.currentView = view;
        document.querySelectorAll('[data-workspace-view]').forEach(function (button) {
            button.classList.toggle('is-active', button.dataset.workspaceView === view);
        });
        document.querySelectorAll('[data-view-panel]').forEach(function (panel) {
            panel.hidden = panel.dataset.viewPanel !== view;
        });
    }

    function setSectionEnabled(section, enabled) {
        section.hidden = !enabled;
        section.querySelectorAll('input, textarea, select').forEach(function (control) {
            control.disabled = !enabled;
        });
    }

    function toLocalInput(value) {
        if (!value) return '';
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        var adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return adjusted.toISOString().slice(0, 16);
    }

    function populateCategoryOptions(kind, selectedId) {
        var select = document.getElementById('content-category');
        select.replaceChildren();
        state.categories
            .filter(function (category) {
                return category.kind === kind && (category.is_active || category.id === selectedId);
            })
            .forEach(function (category) {
                var option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name_zh + ' / ' + category.name_en;
                option.selected = category.id === selectedId;
                select.appendChild(option);
            });
    }

    function openContentForm(kind, item) {
        var kindCategories = state.categories.filter(function (category) {
            return category.kind === kind && category.is_active;
        });
        if (!kindCategories.length && !item) {
            showWorkspaceMessage(
                state.profile.role === 'admin'
                    ? '尚无可用分类。请先导入现有内容。'
                    : '尚无可用分类，请联系管理员。',
                'warning'
            );
            return;
        }

        form.reset();
        hideFormMessage();
        resetTranslationState();
        document.getElementById('content-id').value = item ? item.id : '';
        document.getElementById('content-type').value = kind;
        document.getElementById('content-status').value = item ? item.status : 'published';
        document.getElementById('content-dialog-title').textContent = item
            ? (kind === 'event' ? '编辑活动 / Edit event' : '编辑资源 / Edit resource')
            : (kind === 'event' ? '新建活动 / New event' : '新建资源 / New resource');
        populateCategoryOptions(kind, item && item.category_id);

        var isEvent = kind === 'event';
        setSectionEnabled(document.getElementById('event-fields'), isEvent);
        setSectionEnabled(document.getElementById('resource-fields'), !isEvent);

        if (item && isEvent) {
            document.getElementById('event-title-zh').value = item.title_zh;
            document.getElementById('event-title-en').value = item.title_en;
            document.getElementById('event-location-zh').value = item.location_zh;
            document.getElementById('event-location-en').value = item.location_en;
            document.getElementById('event-start').value = toLocalInput(item.start_at);
            document.getElementById('event-end').value = toLocalInput(item.end_at);
            document.getElementById('event-all-day').checked = item.all_day;
            document.getElementById('event-description-zh').value = item.description_zh;
            document.getElementById('event-description-en').value = item.description_en;
            document.getElementById('event-url').value = item.external_url || '';
        } else if (item) {
            document.getElementById('resource-name-zh').value = item.name_zh;
            document.getElementById('resource-name-en').value = item.name_en;
            document.getElementById('resource-url').value = item.url || '';
            document.getElementById('resource-sort-order').value = item.sort_order;
        }

        dialog.showModal();
    }

    function isHttpUrl(value) {
        if (!value) return false;
        try {
            var url = new URL(value);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (error) {
            return false;
        }
    }

    function getTrimmed(id) {
        return document.getElementById(id).value.trim();
    }

    function getTranslationFields(kind, sourceLanguage, targetLanguage) {
        if (kind === 'event') {
            return [
                {
                    key: 'title',
                    sourceId: 'event-title-' + sourceLanguage,
                    targetId: 'event-title-' + targetLanguage
                },
                {
                    key: 'location',
                    sourceId: 'event-location-' + sourceLanguage,
                    targetId: 'event-location-' + targetLanguage
                },
                {
                    key: 'description',
                    sourceId: 'event-description-' + sourceLanguage,
                    targetId: 'event-description-' + targetLanguage
                }
            ];
        }

        return [{
            key: 'name',
            sourceId: 'resource-name-' + sourceLanguage,
            targetId: 'resource-name-' + targetLanguage
        }];
    }

    function setTranslationLoading(isLoading) {
        translateZhEnButton.disabled = isLoading;
        translateEnZhButton.disabled = isLoading;
    }

    async function handleTranslation(sourceLanguage, targetLanguage) {
        hideFormMessage();
        var kind = getTrimmed('content-type');
        var fields = getTranslationFields(kind, sourceLanguage, targetLanguage);
        var items = fields.map(function (field) {
            return { key: field.key, text: getTrimmed(field.sourceId) };
        });

        if (items.some(function (item) { return !item.text; })) {
            setTranslationStatus(
                sourceLanguage === 'zh'
                    ? '请先完整填写中文内容 / Complete the Chinese fields first.'
                    : '请先完整填写英文内容 / Complete the English fields first.',
                'error'
            );
            return;
        }

        var willOverwrite = fields.some(function (field) { return getTrimmed(field.targetId); });
        if (willOverwrite && !window.confirm('目标语言已有内容，确认使用自动翻译覆盖？ / Replace the existing target-language content?')) {
            return;
        }

        setTranslationLoading(true);
        setTranslationStatus('正在生成翻译，请稍候… / Generating translation…');
        try {
            var result = await translation.translate(sourceLanguage, targetLanguage, items);
            var translationsByKey = new Map(result.translations.map(function (item) {
                return [item.key, item.text];
            }));
            fields.forEach(function (field) {
                document.getElementById(field.targetId).value = translationsByKey.get(field.key) || '';
            });
            state.translationPendingReview = true;
            translationConfirmed.checked = false;
            translationReview.hidden = false;
            setTranslationStatus(
                '翻译已填入表单，请人工检查后勾选确认 / Translation added. Review and confirm before saving.',
                'success'
            );
        } catch (error) {
            setTranslationStatus(error.message || '自动翻译失败 / Automatic translation failed.', 'error');
        } finally {
            setTranslationLoading(false);
        }
    }

    function buildEventValues() {
        var startValue = getTrimmed('event-start');
        var endValue = getTrimmed('event-end');
        var url = getTrimmed('event-url');
        var titleZh = getTrimmed('event-title-zh');
        var titleEn = getTrimmed('event-title-en');
        var locationZh = getTrimmed('event-location-zh');
        var locationEn = getTrimmed('event-location-en');
        var descriptionZh = getTrimmed('event-description-zh');
        var descriptionEn = getTrimmed('event-description-en');
        var start = new Date(startValue);
        var end = endValue ? new Date(endValue) : null;

        if (!titleZh || !titleEn || !locationZh || !locationEn || !descriptionZh || !descriptionEn) {
            throw new Error('中文和英文字段均不能为空 / Both language versions are required.');
        }
        if (Number.isNaN(start.getTime())) throw new Error('请填写有效的活动开始时间。');
        if (end && (Number.isNaN(end.getTime()) || end <= start)) {
            throw new Error('结束时间必须晚于开始时间。');
        }
        if (url && !isHttpUrl(url)) throw new Error('详情链接必须以 http:// 或 https:// 开头。');

        return {
            category_id: getTrimmed('content-category'),
            title_zh: titleZh,
            title_en: titleEn,
            location_zh: locationZh,
            location_en: locationEn,
            description_zh: descriptionZh,
            description_en: descriptionEn,
            start_at: start.toISOString(),
            end_at: end ? end.toISOString() : null,
            all_day: document.getElementById('event-all-day').checked,
            external_url: url || null,
            status: getTrimmed('content-status')
        };
    }

    function buildResourceValues() {
        var status = getTrimmed('content-status');
        var url = getTrimmed('resource-url');
        var nameZh = getTrimmed('resource-name-zh');
        var nameEn = getTrimmed('resource-name-en');
        if (!nameZh || !nameEn) {
            throw new Error('中文和英文资源名称均不能为空 / Both resource names are required.');
        }
        if (url && !isHttpUrl(url)) throw new Error('资源链接必须以 http:// 或 https:// 开头。');
        if (status !== 'draft' && !url) throw new Error('正式发布或归档的资源必须填写链接。');

        return {
            category_id: getTrimmed('content-category'),
            name_zh: nameZh,
            name_en: nameEn,
            url: url || null,
            sort_order: Number.parseInt(getTrimmed('resource-sort-order') || '0', 10),
            status: status
        };
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        hideFormMessage();
        if (!form.reportValidity()) return;

        var kind = getTrimmed('content-type');
        var id = getTrimmed('content-id');
        if (state.translationPendingReview && !translationConfirmed.checked) {
            showFormMessage('请先人工检查并确认自动翻译结果 / Review and confirm the automatic translation first.');
            return;
        }
        saveButton.disabled = true;
        saveButton.textContent = '正在保存… / Saving…';

        try {
            var values = kind === 'event' ? buildEventValues() : buildResourceValues();
            if (kind === 'event') {
                if (id) await data.updateEvent(id, values);
                else await data.createEvent(values, state.profile.id);
            } else {
                if (id) await data.updateResource(id, values);
                else await data.createResource(values, state.profile.id);
            }
            state.translationPendingReview = false;
            dialog.close();
            showWorkspaceMessage('内容已保存 / Content saved.');
            await loadWorkspace();
        } catch (error) {
            showFormMessage(error.message || '保存失败，请检查输入后重试。');
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = '保存 / Save';
        }
    }

    function findContent(kind, id) {
        var items = kind === 'event' ? state.events : state.resources;
        return items.find(function (item) { return item.id === id; });
    }

    async function handleContentAction(event) {
        var button = event.target.closest('[data-content-action]');
        if (!button) return;

        var action = button.dataset.contentAction;
        var kind = button.dataset.contentKind;
        var id = button.dataset.contentId;
        var item = findContent(kind, id);
        if (!item) return;

        if (action === 'edit') {
            openContentForm(kind, item);
            return;
        }

        if (action === 'trash' && !window.confirm('确认移入回收站？内容将在 30 天内可由管理员恢复。')) return;
        button.disabled = true;
        hideWorkspaceMessage();
        try {
            if (action === 'trash') {
                await data.moveToTrash(kind, id);
                showWorkspaceMessage('内容已移入回收站 / Moved to trash.');
            } else if (action === 'restore' && state.profile.role === 'admin') {
                await data.restoreFromTrash(kind, id);
                showWorkspaceMessage('内容已恢复 / Content restored.');
            }
            await loadWorkspace();
        } catch (error) {
            showWorkspaceMessage(error.message || '操作失败，请稍后重试。', 'error');
            button.disabled = false;
        }
    }

    async function handleRoleSave(event) {
        var button = event.target.closest('[data-save-role]');
        if (!button || state.profile.role !== 'admin') return;
        var id = button.dataset.saveRole;
        var select = document.querySelector('[data-profile-role="' + id + '"]');
        button.disabled = true;
        try {
            await data.updateProfileRole(id, select.value);
            showWorkspaceMessage('用户权限已更新 / User access updated.');
            await loadWorkspace();
        } catch (error) {
            showWorkspaceMessage(error.message || '权限更新失败，请稍后重试。', 'error');
            button.disabled = false;
        }
    }

    async function handleLegacyImport() {
        if (state.profile.role !== 'admin') return;
        if (!window.confirm('导入现有活动、资源和分类？此操作可重复执行且不会创建重复内容。')) return;
        importButton.disabled = true;
        try {
            var result = await data.importLegacyContent();
            showWorkspaceMessage(
                '导入完成：新增 ' + result.events_inserted + ' 个活动、' + result.resources_inserted + ' 个资源。'
            );
            await loadWorkspace();
        } catch (error) {
            showWorkspaceMessage(error.message || '导入失败，请确认迁移已执行。', 'error');
        } finally {
            importButton.disabled = false;
        }
    }

    function open(session, profile, options) {
        state.session = session;
        state.profile = profile;
        state.onSignOut = options && options.onSignOut;
        workspaceEmail.textContent = profile.email || session.user.email;
        workspaceRole.textContent = roleLabels[profile.role] || profile.role;
        document.querySelectorAll('[data-admin-only]').forEach(function (element) {
            element.hidden = profile.role !== 'admin';
        });
        document.getElementById('events-scope-note').textContent = profile.role === 'admin'
            ? '显示所有创建者的活动。 / All events.'
            : '仅显示你创建的活动。 / Your events only.';
        document.getElementById('resources-scope-note').textContent = profile.role === 'admin'
            ? '显示所有创建者的资源。 / All resources.'
            : '仅显示你创建的资源。 / Your resources only.';
        workspace.hidden = false;
        hideWorkspaceMessage();
        switchView(state.currentView === 'users' && profile.role !== 'admin' ? 'events' : state.currentView);
        loadWorkspace();
    }

    function close() {
        ++state.loadSequence;
        state.session = null;
        state.profile = null;
        state.categories = [];
        state.events = [];
        state.resources = [];
        state.profiles = [];
        workspace.hidden = true;
        if (dialog.open) dialog.close();
    }

    document.querySelectorAll('[data-workspace-view]').forEach(function (button) {
        button.addEventListener('click', function () { switchView(button.dataset.workspaceView); });
    });
    document.querySelectorAll('[data-dialog-cancel]').forEach(function (button) {
        button.addEventListener('click', function () { dialog.close(); });
    });
    document.querySelectorAll('#events-list, #resources-list, #trash-list').forEach(function (list) {
        list.addEventListener('click', handleContentAction);
    });
    document.getElementById('users-list').addEventListener('click', handleRoleSave);
    newEventButton.addEventListener('click', function () { openContentForm('event', null); });
    newResourceButton.addEventListener('click', function () { openContentForm('resource', null); });
    importButton.addEventListener('click', handleLegacyImport);
    translateZhEnButton.addEventListener('click', function () { handleTranslation('zh', 'en'); });
    translateEnZhButton.addEventListener('click', function () { handleTranslation('en', 'zh'); });
    form.addEventListener('submit', handleFormSubmit);
    logoutButton.addEventListener('click', function () {
        if (state.onSignOut) state.onSignOut();
    });

    window.GCInfoAdminDashboard = Object.freeze({
        open: open,
        close: close
    });
})();
