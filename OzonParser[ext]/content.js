(function () {
    'use strict';

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'PARSE_JSON') {
            const data = collectOzonDataAsJSON();
            sendResponse({ status: 'success', payload: data });
        }
        return true;
    });

    function collectOzonDataAsJSON() {
        const products = [];
        const linkElements = document.querySelectorAll('a[href*="/product/"]');
        const processedUrls = new Set();
        const cardElements = [];

        linkElements.exec = link => link; // заглушка

        linkElements.forEach(link => {
            const card = link.closest('div[class*="tile"]') || 
                         link.closest('div[class*="card"]') || 
                         link.parentElement?.parentElement?.parentElement;
            
            if (card && !cardElements.includes(card)) {
                const href = link.getAttribute('href') || '';
                const cleanUrl = 'https://www.ozon.ru' + href.split('?')[0];
                
                if (!processedUrls.has(cleanUrl) && href.includes('/product/')) {
                    processedUrls.add(cleanUrl);
                    cardElements.push({ card, cleanUrl });
                }
            }
        });

        cardElements.forEach(({ card, cleanUrl }, index) => {
            const skuMatch = cleanUrl.match(/-(\d+)\/?$/);
            const skuId = skuMatch ? skuMatch[1] : null;

            // ИСПРАВЛЕНИЕ: Генерация чистого названия из URL (или точный поиск заголовка)
            let title = '';
            
            // Метод 1: Ищем внутри карточки тег, который по структуре является именно названием (обычно это ссылка с текстом)
            const titleNode = card.querySelector('a[href*="/product/"] span, span[class*="tsBody"]');
            if (titleNode) {
                const text = titleNode.innerText.trim();
                if (text.length > 5 && !text.includes('₽') && !text.includes('%') && !text.includes('ед осталось') && !text.includes('морков')) {
                    title = text;
                }
            }

            // Метод 2: Если верстка изменилась, берем название из самого URL (транслит заменяем на читаемый текст)
            if (!title) {
                const urlParts = cleanUrl.split('/product/');
                if (urlParts[1]) {
                    // Убираем SKU в конце и превращаем дефисы в пробелы
                    let slug = urlParts[1].replace(/-\d+\/?$/, '');
                    title = decodeURIComponent(slug)
                        .replace(/-/g, ' ')
                        .replace(/^./, str => str.toUpperCase());
                }
            }

            title = title ? title.replace(/[\r\n]+/g, ' ').trim() : 'Unknown Product';

            // Цены
            const allCardText = card.innerText.split('\n').map(t => t.trim()).filter(Boolean);
            const priceStrings = allCardText.filter(t => t.includes('₽'));

            const mainPriceRaw = priceStrings[0] || null;
            const originalPriceRaw = priceStrings[1] || null;

            const parsePriceNumber = (str) => {
                if (!str) return null;
                const cleaned = str.replace(/[^\d]/g, '');
                return cleaned ? parseInt(cleaned, 10) : null;
            };

            const discountMatch = allCardText.find(t => /^-\d+%$/.test(t) || (t.includes('%') && t.length < 6));

            products.push({
                position: index + 1,
                sku_id: skuId,
                title: title,
                url: cleanUrl,
                pricing: {
                    current_price: parsePriceNumber(mainPriceRaw),
                    original_price: parsePriceNumber(originalPriceRaw),
                    currency: 'RUB',
                    raw_current_price: mainPriceRaw,
                    raw_original_price: originalPriceRaw,
                    discount_percent: discountMatch ? parseInt(discountMatch.replace(/[^\d]/g, ''), 10) : null
                }
            });
        });

        return {
            target_url: window.location.href,
            scraped_at: new Date().toISOString(),
            total_items: products.length,
            items: products
        };
    }
})();