Baze China — script.js

Замените содержимое существующего script.js в GitHub этим файлом, сделайте Commit changes и дождитесь GitHub Pages. Затем Ctrl+F5.

В обработчике #reviewForm текст отзыва берётся из reviewText и отправляется в оба обязательных столбца reviews.content и reviews.text. Если после замены ошибка про content остаётся, опубликованная страница, вероятно, не использует этот файл или форма подключает другой скрипт. Проверьте Network → запрос rest/v1/reviews → Payload.
