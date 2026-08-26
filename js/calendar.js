(function () {
    'use strict';

    var calendar = null;
    var currentEvents = [];
    var currentCategories = [];
    var documentClickReady = false;

    function closeTooltip() {
        var tooltip = document.getElementById('custom-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    }

    function getCategory(event, categories) {
        return categories.find(function (category) {
            return category.key === event.categoryKey || category.id === event.categoryId;
        });
    }

    function toCalendarEvents(events, categories, language) {
        var i18n = window.GCInfoI18n;

        return events.map(function (event) {
            var category = getCategory(event, categories) || {};
            var color = category.color || '#4f69a2';

            return {
                id: event.id,
                title: i18n.localized(event.title, language),
                start: event.start,
                end: event.end || undefined,
                allDay: Boolean(event.allDay),
                backgroundColor: '#ffffff',
                borderColor: color,
                textColor: color,
                extendedProps: {
                    description: i18n.localized(event.description, language),
                    location: i18n.localized(event.location, language),
                    externalUrl: event.externalUrl || null
                }
            };
        });
    }

    function formatDate(date, language, includeTime) {
        var locale = language === 'zh' ? 'zh-CN' : 'en-US';
        var options = includeTime
            ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
            : { year: 'numeric', month: 'long', day: 'numeric' };
        return new Intl.DateTimeFormat(locale, options).format(date);
    }

    function formatTimeOnly(date, language) {
        return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    function formatEventTime(event, language) {
        var start = event.start;
        if (!start) return '';

        var result = formatDate(start, language, !event.allDay);
        if (!event.end) return result;

        var sameDay = start.getFullYear() === event.end.getFullYear() &&
            start.getMonth() === event.end.getMonth() &&
            start.getDate() === event.end.getDate();

        if (!event.allDay && sameDay) return result + ' – ' + formatTimeOnly(event.end, language);
        return result + ' – ' + formatDate(event.end, language, !event.allDay);
    }

    function positionTooltip(tooltip, jsEvent) {
        var desiredLeft = jsEvent.pageX - tooltip.offsetWidth / 2;
        var maximumLeft = document.documentElement.scrollWidth - tooltip.offsetWidth - 12;
        tooltip.style.left = Math.max(12, Math.min(desiredLeft, maximumLeft)) + 'px';

        var desiredTop = jsEvent.pageY - tooltip.offsetHeight - 15;
        tooltip.style.top = (desiredTop > window.scrollY + 8 ? desiredTop : jsEvent.pageY + 15) + 'px';
    }

    function showEventTooltip(info) {
        var i18n = window.GCInfoI18n;
        var language = i18n.getLanguage();
        var tooltip = document.getElementById('custom-tooltip');
        var description = info.event.extendedProps.description || i18n.t('noDescription');
        var location = info.event.extendedProps.location || '';
        var externalUrl = info.event.extendedProps.externalUrl;
        var link = document.getElementById('tooltip-link');

        document.getElementById('tooltip-title').textContent = info.event.title;
        document.getElementById('tooltip-time').textContent =
            i18n.t('timeLabel') + ': ' + formatEventTime(info.event, language);
        document.getElementById('tooltip-location').textContent = location
            ? i18n.t('locationLabel') + ': ' + location
            : '';
        document.getElementById('tooltip-desc').textContent = description;

        if (externalUrl && window.GCInfoData.isSafeUrl(externalUrl)) {
            link.href = externalUrl;
            link.textContent = i18n.t('detailsLink');
            link.hidden = false;
        } else {
            link.removeAttribute('href');
            link.hidden = true;
        }

        tooltip.style.display = 'block';
        positionTooltip(tooltip, info.jsEvent);
    }

    function getButtonText() {
        var i18n = window.GCInfoI18n;
        return {
            today: i18n.t('today'),
            month: i18n.t('monthView'),
            week: i18n.t('weekView'),
            list: i18n.t('listView')
        };
    }

    function wireTooltipControls() {
        var closeButton = document.querySelector('[data-tooltip-close]');
        if (closeButton && closeButton.dataset.tooltipReady !== 'true') {
            closeButton.dataset.tooltipReady = 'true';
            closeButton.addEventListener('click', closeTooltip);
        }

        if (!documentClickReady) {
            document.addEventListener('click', function (event) {
                var tooltip = document.getElementById('custom-tooltip');
                if (tooltip && !tooltip.contains(event.target) && !event.target.closest('.fc-event')) {
                    closeTooltip();
                }
            });
            documentClickReady = true;
        }
    }

    function init(events, categories, language) {
        var calendarElement = document.getElementById('calendar');
        if (!calendarElement || !window.FullCalendar) {
            console.error('Calendar failed to initialize.');
            return;
        }

        currentEvents = events;
        currentCategories = categories;
        calendar = new FullCalendar.Calendar(calendarElement, {
            initialView: 'dayGridMonth',
            initialDate: new Date(),
            locale: language === 'zh' ? 'zh-cn' : 'en',
            height: '100%',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listMonth'
            },
            buttonText: getButtonText(),
            eventDisplay: 'block',
            displayEventTime: false,
            events: toCalendarEvents(events, categories, language),
            eventClick: showEventTooltip
        });

        calendar.render();
        wireTooltipControls();
    }

    function updateLanguage(language) {
        if (!calendar) return;
        closeTooltip();
        calendar.setOption('locale', language === 'zh' ? 'zh-cn' : 'en');
        calendar.setOption('buttonText', getButtonText());
        calendar.removeAllEvents();
        calendar.addEventSource(toCalendarEvents(currentEvents, currentCategories, language));
    }

    window.GCInfoCalendar = Object.freeze({
        init: init,
        updateLanguage: updateLanguage,
        closeTooltip: closeTooltip
    });
})();
