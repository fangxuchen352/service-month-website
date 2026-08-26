(function () {
    'use strict';

    var content = null;

    function renderLegend(categories, language) {
        var container = document.getElementById('legend-items');
        var i18n = window.GCInfoI18n;
        if (!container) return;

        container.replaceChildren();
        categories
            .filter(function (category) { return category.kind === 'event'; })
            .sort(function (left, right) { return left.sortOrder - right.sortOrder; })
            .forEach(function (category) {
                var item = document.createElement('div');
                var color = document.createElement('div');
                var label = document.createElement('div');

                item.className = 'legend-item';
                color.className = 'legend-color';
                color.style.backgroundColor = category.color || '#4f69a2';
                label.className = 'legend-text';
                label.textContent = i18n.localized(category.name, language);
                item.appendChild(color);
                item.appendChild(label);
                container.appendChild(item);
            });
    }

    function renderForLanguage(language) {
        if (!content) return;
        window.GCInfoResources.render(content.categories, content.resources, language);
        renderLegend(content.categories, language);
        window.GCInfoCalendar.updateLanguage(language);
    }

    async function start() {
        var i18n = window.GCInfoI18n;
        var resourceGrid = document.getElementById('resource-grid');
        if (resourceGrid) resourceGrid.setAttribute('aria-busy', 'true');

        content = await window.GCInfoData.loadPublicContent();
        if (content.error) {
            console.warn('Supabase content could not be loaded; local bilingual content is in use.', content.error);
        }

        document.body.dataset.contentSource = content.source;
        var language = i18n.getLanguage();
        window.GCInfoResources.render(content.categories, content.resources, language);
        renderLegend(content.categories, language);
        window.GCInfoCalendar.init(content.events, content.categories, language);

        i18n.subscribe(renderForLanguage);
    }

    document.addEventListener('DOMContentLoaded', start);
})();
