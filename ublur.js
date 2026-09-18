(() => {
  // База соответствия провайдеров и их реальных сервисов
  const providerUrls = {
    openrouter: (id) => (!id || id === 'openrouter') ? 'https://openrouter.ai/models?max_price=0' : `https://openrouter.ai/${id}`,
    google: () => 'https://aistudio.google.com/',
    bai: () => 'https://chat.b.ai/chat',
    zenmux: () => 'https://zenmux.ai',
    groq: () => 'https://console.groq.com/',
    duckai: () => 'https://duck.ai',
    freeai: () => 'https://free.ai/chat/',
    opencode: () => 'https://opencode.ai/zen',
    orcarouter: () => 'https://www.orcarouter.ai/models',
    zai: () => 'https://chat.z.ai/',
    cerebras: () => 'https://cloud.cerebras.ai/',
    v0: () => 'https://v0.dev/',
    pollinations: () => 'https://enter.pollinations.ai/models',
    zcode: () => 'https://zcode.z.ai/en',
    huggingface: () => 'https://huggingface.co/docs/inference-providers/en/index',
    arena: () => 'https://lmarena.ai/',
    kiosapi: () => 'https://kiosapi.com/',
    github: () => 'https://github.com/'
  };

  const externalLinkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-external-link size-3.5" aria-hidden="true"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>`;

  function resolveUrl(card) {
    // 1. Извлекаем ID модели
    const idEl = card.querySelector('.font-mono.text-\\[14px\\], p.text-white\\/85, .font-mono');
    const modelId = idEl ? idEl.textContent.trim() : '';

    // 2. Извлекаем slug провайдера (из логотипа или текстового имени)
    let slug = '';
    const logoImg = card.querySelector('img[src*="/logos/providers/"]');
    if (logoImg) {
      const match = logoImg.src.match(/logos\/providers\/([^.]+)\.svg/);
      if (match) slug = match[1];
    }
    if (!slug) {
      const pEl = card.querySelector('.text-text-muted, .text-white\\/42');
      const name = pEl ? pEl.textContent.trim().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
      if (name.includes('openrouter')) slug = 'openrouter';
      else if (name.includes('google')) slug = 'google';
      else if (name.includes('groq')) slug = 'groq';
      else if (name.includes('bai')) slug = 'bai';
      else if (name.includes('zenmux')) slug = 'zenmux';
      else if (name.includes('duck')) slug = 'duckai';
      else if (name.includes('freeai') || name.includes('free')) slug = 'freeai';
      else if (name.includes('opencode')) slug = 'opencode';
      else if (name.includes('orca')) slug = 'orcarouter';
      else if (name.includes('zai')) slug = 'zai';
      else if (name.includes('cerebras')) slug = 'cerebras';
      else if (name.includes('v0')) slug = 'v0';
      else if (name.includes('pollinations')) slug = 'pollinations';
      else if (name.includes('zcode')) slug = 'zcode';
      else if (name.includes('hugging')) slug = 'huggingface';
      else if (name.includes('arena')) slug = 'arena';
      else if (name.includes('clawlabs')) slug = 'github';
      else if (name.includes('kios')) slug = 'kiosapi';
    }

    const resolver = providerUrls[slug];
    return resolver ? resolver(modelId) : 'https://openrouter.ai/models?max_price=0';
  }

  function unlockCard(btn) {
    if (btn.dataset.unlocked === 'true') return;
    btn.dataset.unlocked = 'true';

    const targetUrl = resolveUrl(btn);

    // Снимаем размытие с текста и элементов
    btn.querySelectorAll('[class*="blur-"]').forEach(el => {
      el.classList.remove('blur-[3.5px]', 'blur-[3px]', 'brightness-90');
      el.style.filter = 'none';
      el.style.opacity = '1';
    });

    // Удаляем центральный оверлей с замком
    btn.querySelectorAll('span.pointer-events-none.absolute.inset-0.z-20, .locked-overlay').forEach(el => el.remove());

    // Обновляем бейджи с Locked на Open и иконку замка на external-link
    btn.querySelectorAll('.lucide-lock').forEach(icon => {
      const badgeContainer = icon.closest('.flex.shrink-0.items-center');
      if (badgeContainer) {
        const textSpan = badgeContainer.querySelector('span');
        if (textSpan && textSpan.textContent.includes('Locked')) {
          textSpan.textContent = 'Open';
          textSpan.className = textSpan.className.replace('text-white/70', 'text-text group-hover:border-accent group-hover:bg-accent-soft group-hover:text-accent');
        }
        const iconWrap = icon.closest('span');
        if (iconWrap) iconWrap.innerHTML = externalLinkSvg;
      } else {
        const iconWrap = icon.closest('span');
        if (iconWrap) iconWrap.innerHTML = externalLinkSvg;
      }
    });

    // Заменяем <button> на настоящий <a> тег
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

  function run() {
    document.querySelectorAll('button.card-hover, button:has(.locked-overlay)').forEach(unlockCard);
  }

  // Запуск на текущей странице
  run();

  // Наблюдатель за динамическими обновлениями (поиск / фильтры)
  const observer = new MutationObserver(() => run());
  observer.observe(document.body, { childList: true, subtree: true });

  console.log('✅ Все заблокированные кнопки успешно превращены в кликабельные ссылки "Open"!');
})();
