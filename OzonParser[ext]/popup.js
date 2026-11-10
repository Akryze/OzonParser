document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('downloadJson');
    const copyBtn = document.getElementById('copyJson');
    const statusDiv = document.getElementById('status');

    function sendParseRequest(callback) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) {
                statusDiv.innerText = 'Ошибка: Вкладка не найдена.';
                return;
            }

            chrome.tabs.sendMessage(tabs[0].id, { action: 'PARSE_JSON' }, (response) => {
                if (chrome.runtime.lastError) {
                    statusDiv.innerText = 'Обновите страницу Ozon!';
                    return;
                }
                if (response && response.payload) {
                    callback(response.payload);
                } else {
                    statusDiv.innerText = 'Не удалось извлечь данные.';
                }
            });
        });
    }

    // Скачивание JSON
    downloadBtn.addEventListener('click', () => {
        sendParseRequest((data) => {
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `ozon_data_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);

            statusDiv.innerText = `Успешно! Собрано товаров: ${data.total_items}`;
        });
    });

    // Копирование JSON в буфер обмена
    copyBtn.addEventListener('click', () => {
        sendParseRequest((data) => {
            const jsonString = JSON.stringify(data, null, 2);
            navigator.clipboard.writeText(jsonString).then(() => {
                statusDiv.innerText = 'JSON скопирован в буфер!';
            });
        });
    });
});