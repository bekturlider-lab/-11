import { categories, news } from "/news.js";

const app = document.querySelector("#app");
const searchInput = document.querySelector("#search-input");
const currentPath = () => window.location.pathname.replace(/\/+$/, "") || "/";
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);

function categoryLink(category) {
  const found = categories.find((item) => item.title === category);
  return found ? `/category/${found.slug}` : "/";
}

function timeAgo(publishedAt) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(publishedAt)) / 60_000));
  if (minutes < 60) return `${minutes} мин. назад`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `${hours} ${hours === 1 ? "час" : hours < 5 ? "часа" : "часов"} назад`;
  }
  return "вчера";
}

function formattedDate(publishedAt) {
  return new Intl.DateTimeFormat("ru-KZ", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(new Date(publishedAt));
}

function metaTags(item) {
  document.title = item ? `${item.title} — Qazaq Daily` : "Qazaq Daily — новости Казахстана";
  const description = item?.summary ?? "Новости Казахстана: города и регионы, экономика, культура и спорт. Нейтрально и по делу.";
  document.querySelector('meta[name="description"]').content = description;
  document.querySelector('meta[property="og:title"]').content = document.title;
  document.querySelector('meta[property="og:description"]').content = description;
  document.querySelector('meta[property="og:type"]').content = item ? "article" : "website";
}

function storyCard(item, featured = false) {
  const type = featured ? "lead-card" : "news-card";
  const titleTag = featured ? "h2" : "h3";
  return `<article class="${type}">
    <a class="story-image" href="/news/${encodeURIComponent(item.slug)}" tabindex="-1" aria-hidden="true">
      <img src="${escapeHtml(item.image)}" alt="" ${featured ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
      <span class="image-category">${escapeHtml(item.category)}</span>
    </a>
    <div class="story-copy">
      <a class="story-title" href="/news/${encodeURIComponent(item.slug)}"><${titleTag}>${escapeHtml(item.title)}</${titleTag}></a>
      ${featured ? `<p class="story-summary">${escapeHtml(item.summary)}</p>` : ""}
      <div class="story-meta"><span>${escapeHtml(timeAgo(item.publishedAt))}</span><span class="meta-separator">·</span><span>${item.readTime} мин. чтения</span></div>
    </div>
  </article>`;
}

function renderCategories() {
  return `<nav class="category-directory" aria-label="Все рубрики">
    <div class="section-heading"><div><span class="eyebrow">Навигация</span><h2>Рубрики</h2></div></div>
    <div class="category-list">${categories.map((category) => `<a href="/category/${category.slug}">${escapeHtml(category.title)}<span aria-hidden="true">↗</span></a>`).join("")}</div>
  </nav>`;
}

function renderPopular(items = news) {
  const popular = [...items].sort((a, b) => b.views - a.views).slice(0, 5);
  return `<aside class="popular-panel" id="popular">
    <div class="section-heading"><div><span class="eyebrow">Выбор читателей</span><h2>Самое читаемое</h2></div></div>
    <ol class="popular-list">${popular.map((item, index) => `<li>
      <span class="popular-number">${String(index + 1).padStart(2, "0")}</span>
      <div><a href="/news/${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a>
      <span class="popular-views">${item.views.toLocaleString("ru-RU")} просмотров</span></div>
    </li>`).join("")}</ol>
  </aside>`;
}

function renderLatest(items, heading = "Последние новости") {
  return `<section class="latest-section" id="latest">
    <div class="section-heading"><div><span class="eyebrow">Лента</span><h2>${escapeHtml(heading)}</h2></div><span class="section-count">${items.length} материалов</span></div>
    <div class="news-grid" data-news-grid>${items.slice(0, 6).map((item) => storyCard(item)).join("")}</div>
    ${items.length > 6 ? '<button class="load-more" type="button" data-load-more>Показать ещё <span aria-hidden="true">↓</span></button>' : ""}
  </section>`;
}

function renderCurrency() {
  return `<aside class="currency-widget" aria-label="Демонстрационный курс валют">
    <div class="widget-heading"><div><span class="eyebrow">Ориентир · демо</span><h2>Курс валют</h2></div><span class="currency-unit">к ₸</span></div>
    <dl class="currency-list">
      <div><dt>USD</dt><dd>498,20 <span>—</span></dd></div>
      <div><dt>EUR</dt><dd>541,70 <span>—</span></dd></div>
      <div><dt>RUB</dt><dd>5,08 <span>—</span></dd></div>
    </dl>
    <p>Условные значения для демонстрации интерфейса.</p>
  </aside>`;
}

function renderHome() {
  const [lead, ...rest] = news;
  const latest = rest.slice(3);
  app.innerHTML = `<section class="top-stories" aria-label="Главные новости">
    <div class="section-heading top-heading"><div><span class="eyebrow"><span class="live-dot"></span> Новости Казахстана</span><h1>Главное — спокойно и по делу</h1></div><p>Демо-издание о жизни городов и регионов страны.</p></div>
    <div class="lead-layout">
      ${storyCard(lead, true)}
      <div class="side-stories">${rest.slice(0, 3).map((item) => storyCard(item)).join("")}</div>
    </div>
  </section>
  <div class="content-layout">
    <div>${renderLatest(latest)}${renderCategories()}</div>
    <div class="sidebar">${renderPopular()}${renderCurrency()}</div>
  </div>`;
  setupLoadMore(latest);
}

function setupLoadMore(items) {
  const button = app.querySelector("[data-load-more]");
  const grid = app.querySelector("[data-news-grid]");
  if (!button || !grid) return;
  let visible = 6;
  button.addEventListener("click", () => {
    const next = items.slice(visible, visible + 6);
    grid.insertAdjacentHTML("beforeend", next.map((item) => storyCard(item)).join(""));
    visible += next.length;
    if (visible >= items.length) button.remove();
  });
}

function renderListing(items, title, eyebrow) {
  app.innerHTML = `<section class="listing-page">
    <div class="section-heading listing-heading"><div><span class="eyebrow">${escapeHtml(eyebrow)}</span><h1>${escapeHtml(title)}</h1></div><span class="section-count">${items.length} материалов</span></div>
    ${items.length ? `<div class="news-grid listing-grid" data-news-grid>${items.slice(0, 6).map((item) => storyCard(item)).join("")}</div>
    ${items.length > 6 ? '<button class="load-more" type="button" data-load-more>Показать ещё <span aria-hidden="true">↓</span></button>' : ""}` : '<p class="empty-state">По вашему запросу ничего не найдено. Попробуйте изменить запрос.</p>'}
  </section>`;
  setupLoadMore(items);
}

function renderArticle(item) {
  app.innerHTML = `<article class="article-page">
    <a class="back-link" href="/">← <span>На главную</span></a>
    <header class="article-header">
      <a class="article-category" href="${categoryLink(item.category)}">${escapeHtml(item.category)}</a>
      <h1>${escapeHtml(item.title)}</h1>
      <p class="article-summary">${escapeHtml(item.summary)}</p>
      <div class="article-byline"><span>${escapeHtml(item.author)}</span><span>·</span><time datetime="${escapeHtml(item.publishedAt)}">${escapeHtml(formattedDate(item.publishedAt))}</time><span>·</span><span>${item.readTime} мин. чтения</span></div>
    </header>
    <figure class="article-image"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" fetchpriority="high" decoding="async"></figure>
    <div class="article-body">${item.fullText.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}<p class="demo-disclaimer">Демонстрационная новость. Все персонажи и события в этом материале вымышлены.</p></div>
    <section class="related-section"><div class="section-heading"><div><span class="eyebrow">Продолжить чтение</span><h2>Читайте также</h2></div></div>
      <div class="news-grid related-grid">${news.filter((candidate) => candidate.category === item.category && candidate.id !== item.id).slice(0, 3).map((candidate) => storyCard(candidate)).join("") || '<p class="empty-state">Пока нет других новостей в этой рубрике.</p>'}</div>
    </section>
  </article>`;
}

function renderNotFound() {
  app.innerHTML = `<section class="not-found"><span class="eyebrow">404 · Страница не найдена</span><h1>Кажется, эта новость потерялась</h1><p>Вернитесь на главную — там собраны последние материалы.</p><a class="button-link" href="/">На главную</a></section>`;
}

function renderRoute() {
  const path = currentPath();
  const articleMatch = path.match(/^\/news\/([^/]+)$/);
  const categoryMatch = path.match(/^\/category\/([^/]+)$/);
  if (articleMatch) {
    let slug;
    try { slug = decodeURIComponent(articleMatch[1]); } catch { renderNotFound(); return; }
    const item = news.find((candidate) => candidate.slug === slug);
    if (!item) { renderNotFound(); return; }
    metaTags(item);
    renderArticle(item);
    return;
  }
  if (categoryMatch) {
    const category = categories.find((candidate) => candidate.slug === categoryMatch[1]);
    if (!category) { renderNotFound(); return; }
    metaTags();
    renderListing(news.filter((item) => item.category === category.title), category.title, "Рубрика");
    return;
  }
  if (path === "/search") {
    metaTags();
    const query = new URLSearchParams(window.location.search).get("q")?.trim() ?? "";
    searchInput.value = query;
    const normalized = query.toLocaleLowerCase("ru");
    const results = normalized ? news.filter((item) =>
      `${item.title} ${item.summary} ${item.fullText.join(" ")}`.toLocaleLowerCase("ru").includes(normalized)
    ) : [];
    renderListing(results, "Результаты поиска", query ? `По запросу: «${query}»` : "Поиск");
    return;
  }
  if (path !== "/" && path !== "/index.html") { renderNotFound(); return; }
  metaTags();
  renderHome();
}

document.querySelector("#year").textContent = String(new Date().getFullYear());

const themeToggle = document.querySelector("#theme-toggle");
const savedTheme = localStorage.getItem("qazaq-daily-theme");
if (savedTheme === "dark") document.documentElement.dataset.theme = "dark";
function updateThemeButton() {
  const dark = document.documentElement.dataset.theme === "dark";
  themeToggle.setAttribute("aria-label", dark ? "Включить светлую тему" : "Включить тёмную тему");
  themeToggle.querySelector(".theme-icon").textContent = dark ? "☼" : "◐";
}
updateThemeButton();
themeToggle.addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme !== "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  localStorage.setItem("qazaq-daily-theme", dark ? "dark" : "light");
  updateThemeButton();
});

document.querySelector("#search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();
  window.location.href = query ? `/search?q=${encodeURIComponent(query)}` : "/search";
});

document.querySelector("#newsletter-form").addEventListener("submit", (event) => {
  event.preventDefault();
  document.querySelector("#newsletter-status").textContent = "Спасибо! Подписка в демо-режиме не сохраняется.";
  event.currentTarget.reset();
});

window.addEventListener("popstate", renderRoute);
renderRoute();
