BAZE CHINA — обновлённый script.js

Что изменено:
- обработчик отзывов читает текст из reviewText, content или text;
- если имя/текст имеет другое имя поля, используется значение соответствующего input/textarea;
- в Supabase отправляются оба обязательных поля content и text;
- в Console выводится payload перед отправкой для диагностики.

Установка:
1. Распакуйте архив.
2. Замените содержимое script.js в репозитории GitHub этим файлом.
3. Commit changes и дождитесь публикации GitHub Pages.
4. На сайте нажмите Ctrl+F5.
5. Отправьте тестовый отзыв. В DevTools Console найдите "Submitting review payload".

Если после этого Supabase всё ещё сообщает NULL для content, проверьте Network → rest/v1/reviews → Payload. Если content в Payload содержит текст, проблема находится на стороне схемы/триггеров БД, а не в формировании запроса.
