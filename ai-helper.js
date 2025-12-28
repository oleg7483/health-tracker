// Функция анализа текста (упрощённый пример)
function analyze() {
    const userText = document.getElementById('userInput').value;
    const outputContainer = document.getElementById('outputContainer');
    const output = document.getElementById('output');

    if (!userText.trim()) {
        alert('Пожалуйста, заполните текстовое поле!');
        return;
    }

    // Пример базового анализа
    let analysis = "Ваше состояние анализируется...\n";

    if (userText.toLowerCase().includes('давление')) {
        analysis += "- Обнаружены упоминания давления. Возможно, стоит проверить уровень стресса.\n";
    }
    if (userText.toLowerCase().includes('сон')) {
        analysis += "- Обнаружены замечания о сне. Убедитесь, что сон был качественным.\n";
    }
    if (userText.toLowerCase().includes('спазм')) {
        analysis += "- Замечены упоминания о шейных спазмах. Рекомендуется расслабляющая гимнастика.\n";
    }

    if (!analysis.includes('-')) {
        analysis += "- Не обнаружено явных триггеров. Всё выглядит нормально.";
    }

    // Отображение анализа
    output.textContent = analysis;
    outputContainer.classList.remove('hidden');
}

// Очистка текста и результата
function clearInput() {
    document.getElementById('userInput').value = '';
    document.getElementById('outputContainer').classList.add('hidden');
}
