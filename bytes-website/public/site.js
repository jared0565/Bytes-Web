// Footer year (no inline scripts: the Content-Security-Policy forbids them)
document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

// Inner pages: builds the "On this page" list from the article's h2s and highlights the section in view.
(function () {
  const article = document.querySelector('.prose');
  const list = document.querySelector('.toc ol');
  if (!article || !list) return;

  const slug = (text) => text.toLowerCase().replace(/^\d+\.\s*/, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const headings = [...article.querySelectorAll(':scope > h2')]; // skips the CTA box heading
  headings.forEach((h) => {
    if (!h.id) h.id = slug(h.textContent);
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    a.textContent = h.textContent.replace(/^\d+\.\s*/, '');
    li.appendChild(a);
    list.appendChild(li);
  });

  const links = [...list.querySelectorAll('a')];
  const setCurrent = (id) => links.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === `#${id}`));
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible[0]) setCurrent(visible[0].target.id);
  }, { rootMargin: '-96px 0px -65% 0px' });
  headings.forEach((h) => observer.observe(h));
})();
