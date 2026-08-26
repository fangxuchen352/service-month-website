(function () {
    'use strict';

    var documentClickReady = false;

    function closeAllMenus() {
        document.querySelectorAll('[data-resource-menu]').forEach(function (item) {
            var trigger = item.querySelector('.resource-trigger');
            item.classList.remove('active');
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
        });
    }

    function toggleMenu(item, event) {
        event.stopPropagation();
        var shouldOpen = !item.classList.contains('active');
        closeAllMenus();

        if (shouldOpen) {
            item.classList.add('active');
            item.querySelector('.resource-trigger').setAttribute('aria-expanded', 'true');
        }
    }

    function createResourceItem(category, resources, language) {
        var i18n = window.GCInfoI18n;
        var item = document.createElement('div');
        var trigger = document.createElement(resources.length ? 'button' : 'div');
        var icon = document.createElement('div');
        var description = document.createElement('div');
        var menu = document.createElement('div');

        item.className = 'icon-item';
        trigger.className = 'resource-trigger';
        icon.className = 'circle-icon';
        description.className = 'icon-desc';
        menu.className = 'dropdown-menu';
        icon.textContent = i18n.localized(category.name, language);
        icon.style.backgroundColor = category.color || '#4f69a2';
        icon.style.boxShadow = '0 4px 12px ' + (category.color || '#4f69a2') + '4d';

        if (!resources.length) {
            item.classList.add('icon-item--empty');
            description.textContent = i18n.t('comingSoon');
        } else {
            item.dataset.resourceMenu = '';
            trigger.type = 'button';
            trigger.setAttribute('aria-expanded', 'false');
            trigger.setAttribute('aria-label', i18n.localized(category.name, language));
            description.textContent = i18n.t('resourceAction');

            resources.forEach(function (resource) {
                var link = document.createElement('a');
                link.href = resource.url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = i18n.localized(resource.name, language);
                menu.appendChild(link);
            });

            trigger.addEventListener('click', function (event) {
                toggleMenu(item, event);
            });
        }

        trigger.appendChild(icon);
        trigger.appendChild(description);
        item.appendChild(trigger);
        if (resources.length) item.appendChild(menu);
        return item;
    }

    function render(categories, resources, language) {
        var container = document.getElementById('resource-grid');
        if (!container) return;

        closeAllMenus();
        container.replaceChildren();
        container.removeAttribute('aria-busy');

        categories
            .filter(function (category) { return category.kind === 'resource'; })
            .sort(function (left, right) { return left.sortOrder - right.sortOrder; })
            .forEach(function (category) {
                var categoryResources = resources
                    .filter(function (resource) {
                        return resource.categoryKey === category.key || resource.categoryId === category.id;
                    })
                    .sort(function (left, right) { return left.sortOrder - right.sortOrder; });

                container.appendChild(createResourceItem(category, categoryResources, language));
            });

        if (!documentClickReady) {
            document.addEventListener('click', closeAllMenus);
            documentClickReady = true;
        }
    }

    window.GCInfoResources = Object.freeze({
        render: render,
        closeAllMenus: closeAllMenus
    });
})();
