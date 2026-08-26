(function () {
    'use strict';

    var STORAGE_KEY = 'gcinfo-language';
    var supportedLanguages = ['zh', 'en'];
    var listeners = [];
    var messages = {
        zh: {
            pageTitle: 'GC学生会活动安排',
            subtitle: '汇聚各学生组织最新鲜的活动资讯与指南',
            management: '内容管理',
            producedBy: '✨ GC学生会出品',
            languageAction: 'English',
            languageActionLabel: 'Switch to English',
            calendarLabel: '活动日历',
            resourcesLabel: '学生资源',
            resourceAction: '点击查看 ▼',
            comingSoon: '筹备中...',
            legendTitle: '🎨 活动图例',
            closeDetails: '关闭活动详情',
            noDescription: '暂无更多详细信息',
            timeLabel: '时间',
            locationLabel: '地点',
            detailsLink: '查看详情',
            today: '今天',
            monthView: '月视图',
            weekView: '周视图',
            listView: '日程表',
            loading: '正在加载内容…'
        },
        en: {
            pageTitle: 'GC Student Union Events',
            subtitle: 'The latest events and guides from GC student organizations',
            management: 'Manage Content',
            producedBy: '✨ By GC Student Union',
            languageAction: '中文',
            languageActionLabel: '切换至中文',
            calendarLabel: 'Event calendar',
            resourcesLabel: 'Student resources',
            resourceAction: 'View links ▼',
            comingSoon: 'Coming soon...',
            legendTitle: '🎨 Event Legend',
            closeDetails: 'Close event details',
            noDescription: 'No additional details are available.',
            timeLabel: 'Time',
            locationLabel: 'Location',
            detailsLink: 'View details',
            today: 'Today',
            monthView: 'Month',
            weekView: 'Week',
            listView: 'Schedule',
            loading: 'Loading content…'
        }
    };

    function normalizeLanguage(language) {
        return supportedLanguages.includes(language) ? language : null;
    }

    function readStoredLanguage() {
        try {
            return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
        } catch (error) {
            return null;
        }
    }

    function detectLanguage() {
        var queryLanguage = normalizeLanguage(new URLSearchParams(window.location.search).get('lang'));
        return queryLanguage || readStoredLanguage() || 'zh';
    }

    var currentLanguage = detectLanguage();

    function t(key) {
        return messages[currentLanguage][key] || messages.zh[key] || key;
    }

    function localized(value, language) {
        var selectedLanguage = normalizeLanguage(language) || currentLanguage;
        if (!value || typeof value !== 'object') return String(value || '');
        return value[selectedLanguage] || value.zh || value.en || '';
    }

    function applyToDocument() {
        document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : 'en';
        document.title = t('pageTitle');

        document.querySelectorAll('[data-i18n]').forEach(function (element) {
            element.textContent = t(element.dataset.i18n);
        });

        document.querySelectorAll('[data-i18n-aria-label]').forEach(function (element) {
            element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
        });
    }

    function storeLanguage(language) {
        try {
            window.localStorage.setItem(STORAGE_KEY, language);
        } catch (error) {
            // Language selection still works when browser storage is unavailable.
        }
    }

    function updateUrl(language) {
        try {
            var url = new URL(window.location.href);
            url.searchParams.set('lang', language);
            window.history.replaceState(null, '', url);
        } catch (error) {
            // Older browsers can still switch language without updating the URL.
        }
    }

    function setLanguage(language) {
        var normalized = normalizeLanguage(language);
        if (!normalized) return;

        currentLanguage = normalized;
        storeLanguage(normalized);
        updateUrl(normalized);
        applyToDocument();
        listeners.slice().forEach(function (listener) {
            listener(normalized);
        });
    }

    function subscribe(listener) {
        listeners.push(listener);
        return function () {
            listeners = listeners.filter(function (candidate) {
                return candidate !== listener;
            });
        };
    }

    function wireLanguageButton() {
        var button = document.querySelector('[data-language-toggle]');
        if (!button || button.dataset.languageReady === 'true') return;

        button.dataset.languageReady = 'true';
        button.addEventListener('click', function () {
            setLanguage(currentLanguage === 'zh' ? 'en' : 'zh');
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        applyToDocument();
        wireLanguageButton();
    });

    window.GCInfoI18n = Object.freeze({
        getLanguage: function () { return currentLanguage; },
        setLanguage: setLanguage,
        localized: localized,
        t: t,
        subscribe: subscribe,
        apply: applyToDocument
    });
})();
