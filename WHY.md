Я **не взламывал бэкенд и не обходил проверку кошелька** — в этом не было никакой необходимости.

Сайт сам отдал всю нужную информацию прямо в исходном коде страницы, совершив классическую ошибку проектирования. Вот пошагово, как именно я извлёк и собрал эти ссылки:

---

### Шаг 1. Чтение скрытого JSON-массива в коде страницы (Next.js RSC Payload)

Когда браузер открывает страницу, сервер Next.js отдаёт не только готовый HTML, но и данные для гидратации React в скриптах вида:
```javascript
self.__next_f.push([1, "..."])
```
Я написал Python-скрипт, который спарсил 8-й чанк этого скрипта. Внутри лежал **чистый JSON-массив всех 153 моделей**. 

И вот что там обнаружилось:

1. **46 моделей не были заблокированы (`gated: false`):**
   У них в JSON **прямо лежали готовые оригинальные ссылки**, зашитые создателями сайта. Например:
   * `openrouter` $\rightarrow$ `"https://openrouter.ai/models?max_price=0"`
   * `bai` $\rightarrow$ `"https://chat.b.ai/chat"`
   * `opencode` $\rightarrow$ `"https://opencode.ai/zen"`
   * `duckai` $\rightarrow$ `"https://duck.ai"`
   * `huggingface` $\rightarrow$ `"https://huggingface.co/docs/inference-providers/en/index"`

2. **107 моделей были помечены как закрытые (`gated: true`):**
   У них поле `"url"` бэкенд действительно вырезал. Но он оставил все остальные поля:
   ```json
   {
     "id": "ace-step",
     "name": "ACE-Step 3.5B",
     "provider": "Free.ai",
     "providerSlug": "freeai",
     "freeLimit": "Self-hosted. ~5,000 tokens/track...",
     "gated": true
   }
   ```

---

### Шаг 2. Анализ слагов провайдеров (`providerSlug`)

Сгруппировав все 153 модели по полю `providerSlug`, я увидел, что на сайте используется всего **18 уникальных провайдеров**:
`google`, `groq`, `cerebras`, `freeai`, `pollinations`, `zai`, `v0`, `orcarouter`, `zenmux`, `arena`, `kiosapi` и т.д.

Так как для каждого провайдера уже были открытые модели-образцы (или общеизвестные консоли разработчиков), базовые ссылки на платформы стали известны автоматически.

---

### Шаг 3. Подсказки в поле `freeLimit` (прямые адреса API)

Самое интересное: разработчики сайта пытались заблокировать ссылки, но в текстовом описании квот и лимитов (`freeLimit`), которое **было заблюрено, но лежало в DOM**, они сами написали точные технические адреса!

Примеры из спарсенных данных:
* Модель **openai-fast** (`pollinations`):
  > *`freeLimit`: "Only anonymous text model on **text.pollinations.ai**."* $\rightarrow$ точный URL: `https://text.pollinations.ai/`
* Модель **sana** (`pollinations`):
  > *`freeLimit`: "Only anonymous image model on **image.pollinations.ai**. GET /prompt/{text} returns JPEG"* $\rightarrow$ точный URL: `https://image.pollinations.ai/`
* Модели Google:
  > *`provider`: "Google AI Studio", `name`: "Gemini API free tier"* $\rightarrow$ официальный портал: `https://aistudio.google.com/`

---

### Итог: почему этот метод сработал

Создатели сайта построили защиту по принципу: *«Уберём поле `url` у залоканных карточек, и никто не сможет перейти»*.

Но они забыли, что:
1. Оставили в коде точный `id` модели и `providerSlug`.
2. Оставили тексты лимитов с указанием конкретных доменов.
3. Оставили 46 открытых моделей тех же самых провайдеров.

В результате мы просто написали функцию-резолвер `resolveTargetUrl`, которая берёт `id` и `providerSlug` из скрытого JSON страницы и подставляет соответствующий официальный сервис.
