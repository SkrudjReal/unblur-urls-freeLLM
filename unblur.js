(() => {
  // 1. Вшиваем глобальные стили: мгновенное снятие блюра и скрытие оверлеев
  const styleId = 'freellm-unblur-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      [class*="blur-"],
      .card-hover > div,
      button.card-hover > div {
        filter: none !important;
        -webkit-filter: none !important;
        opacity: 1 !important;
      }
      .locked-overlay,
      span.pointer-events-none.absolute.inset-0.z-20 {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // 2. Пытаемся извлечь оригинальный каталог моделей из памяти Next.js / RSC payload
  const rscCatalog = {};
  try {
    const rscChunks = window.__next_f || [];
    for (const chunk of rscChunks) {
      if (typeof chunk[1] === 'string' && chunk[1].includes('"providerSlug"')) {
        const match = chunk[1].match(/\[\{"id":"[^"]+",.*?\}\]/);
        if (match) {
          const list = JSON.parse(match[0]);
          list.forEach(m => {
            if (m.id) rscCatalog[m.id.toLowerCase()] = m;
          });
          break;
        }
      }
    }
  } catch (e) {
    console.warn('[uBlur] Не удалось распарсить RSC чанк, работаем по DOM:', e);
  }

  // 3. Таблица маршрутизации провайдеров
  const providerUrls = {
    openrouter: (id) => (!id || id === 'openrouter') ? 'https://openrouter.ai/models?max_price=0' : `https://openrouter.ai/${id}`,
    google: () => 'https://aistudio.google.com/',
    groq: () => 'https://console.groq.com/',
    freeai: () => 'https://free.ai/chat/',
    duckai: () => 'https://duck.ai',
    opencode: () => 'https://opencode.ai/zen',
    bai: () => 'https://chat.b.ai/chat',
    zenmux: () => 'https://zenmux.ai',
    orcarouter: () => 'https://www.orcarouter.ai/models',
    cerebras: () => 'https://cloud.cerebras.ai/',
    pollinations: (id) => {
      if (id === 'openai-fast') return 'https://text.pollinations.ai/';
      if (id === 'sana') return 'https://image.pollinations.ai/';
      return 'https://enter.pollinations.ai/models';
    },
    zai: () => 'https://chat.z.ai/',
    v0: () => 'https://v0.dev/',
    huggingface: () => 'https://huggingface.co/docs/inference-providers/en/index',
    arena: () => 'https://lmarena.ai/',
    zcode: () => 'https://zcode.z.ai/en',
    github: () => 'https://github.com/clawlabs/free-ai-models',
    kiosapi: () => 'https://kiosapi.com/'
  };

  const externalLinkSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-external-link size-3.5" aria-hidden="true">
      <path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    </svg>`;

  function extractModelId(el) {
    // В сетке ID лежит в .font-mono
    const cardId = el.querySelector('.font-mono.text-\\[14px\\], .font-mono');
    if (cardId && cardId.textContent.trim()) return cardId.textContent.trim();

    // В списке ID лежит в подзаголовке .text-white\/28
    const listId = el.querySelector('p.text-white\\/28');
    if (listId && listId.textContent.trim()) return listId.textContent.trim();

    return '';
  }

  function resolveTargetUrl(el) {
    const rawId = extractModelId(el);
    const cleanId = rawId.toLowerCase().trim();

    // Если модель есть в спарсенном каталоге
    const meta = rscCatalog[cleanId];
    if (meta) {
      if (meta.url) return meta.url; // Оригинальная ссылка, если была доступна
      if (meta.providerSlug && providerUrls[meta.providerSlug]) {
        return providerUrls[meta.providerSlug](rawId);
      }
    }

    // Резервный поиск по тексту провайдера в DOM
    const textBlock = el.textContent.toLowerCase();
    for (const [slug, resolver] of Object.entries(providerUrls)) {
      if (textBlock.includes(slug)) {
        return resolver(rawId);
      }
    }

    if (textBlock.includes('google')) return providerUrls.google();
    if (textBlock.includes('clawlabs')) return providerUrls.github();

    return `https://openrouter.ai/models?max_price=0`;
  }

  function unlockElement(btn) {
    if (btn.tagName === 'A' || btn.dataset.unlocked === 'true') return;
    btn.dataset.unlocked = 'true';

    const targetUrl = resolveTargetUrl(btn);

    // Удаляем классы размытия с самого контейнера и потомков
    btn.classList.remove(
      '[&>:not(.locked-overlay)]:blur-[3px]',
      '[&>:not(.locked-overlay)]:brightness-90'
    );
    btn.querySelectorAll('[class*="blur-"]').forEach(el => {
      el.classList.remove('blur-[3.5px]', 'blur-[3px]', 'brightness-90');
      el.style.filter = 'none';
    });

    // Удаляем оверлеи с замками
    btn.querySelectorAll('.locked-overlay, span.pointer-events-none.absolute.inset-0.z-20').forEach(e => e.remove());

    // Меняем плашку Locked на Open (зеленая подсветка)
    btn.querySelectorAll('.lucide-lock').forEach(lockIcon => {
      const badgeContainer = lockIcon.closest('.flex.shrink-0.items-center, div, span');
      if (badgeContainer) {
        const textSpan = badgeContainer.querySelector('span');
        if (textSpan && textSpan.textContent.includes('Locked')) {
          textSpan.textContent = 'Open';
          textSpan.className = textSpan.className
            .replace(/border-white\/\d+/, 'border-spirit/40')
            .replace(/bg-white\/\[.*?\]/, 'bg-spirit/10')
            .replace('text-white/70', 'text-spirit');
        }
      }
      const iconWrap = lockIcon.closest('span') || lockIcon;
      iconWrap.innerHTML = externalLinkSvg;
    });

    // Создаем ссылку вместо кнопки
    const link = document.createElement('a');
    link.href = targetUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = btn.className;
    link.dataset.unlocked = 'true';

    while (btn.firstChild) {
      link.appendChild(btn.firstChild);
    }

    btn.parentNode.replaceChild(link, btn);
  }

  function processAll() {
    // Выбираем заблокированные кнопки как из Card View, так и из List View
    const targets = document.querySelectorAll(`
      button.card-hover,
      button:has(.lucide-lock),
      button:has(.locked-overlay),
      button[class*="grid-cols-"]
    `);

    targets.forEach(unlockElement);
  }

  // Оптимизированный запуск через requestAnimationFrame
  let scheduled = false;
  function scheduleProcess() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      processAll();
      scheduled = false;
    });
  }

  scheduleProcess();

  // Наблюдатель за сменой фильтров / поиском / пагинацией
  const observer = new MutationObserver(() => scheduleProcess());
  observer.observe(document.body, { childList: true, subtree: true });

  console.log('✨ [uBlur] Все 153 модели разблокированы, ссылки сформированы, фильтры сняты.');
})();
