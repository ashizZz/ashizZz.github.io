// Configuration
        const CONFIG = {
            CACHE_DURATION: 30 * 60 * 1000, // 30 minutes
            AUTO_REFRESH_INTERVAL: 30 * 60 * 1000, // 30 minutes
            MAX_ITEMS_PER_FEED: 10,
            PROXY_URL: "https://api.rss2json.com/v1/api.json?rss_url=",
            FETCH_TIMEOUT: 15000, // 15 seconds per feed
            CONCURRENT_FEEDS: 10, // Load 10 feeds at a time
            USE_CACHE_FIRST: true, // Show cached feeds immediately
            MAX_INITIAL_PAINT: 30, // Fast first frame — only mount this many cards
            MAX_INITIAL_ITEMS: 30, // Alias for spec / external hooks
            LAZY_CARD_BATCH: 24, // Cards built per idle slice
            SNAPSHOT_MAX_AGE_MS: 12 * 60 * 60 * 1000 // 12h — then background live refresh
        };
        CONFIG.MAX_INITIAL_ITEMS = CONFIG.MAX_INITIAL_PAINT;

        /** Single source of truth: _data/stayupdated-feeds.yml → aggregator layout */
        const rssFeeds = (window.__SU_FEEDS__ || []).map((f) => ({
            name: f.name,
            url: f.url,
            category: f.category || null
        }));

        // State management
        const state = {
            allItems: [],
            filteredItems: [],
            selectedSources: new Set(),
            expandedCategories: new Set(),
            searchQuery: '',
            sortBy: 'date-desc',
            dateFilter: '3days',
            dateFrom: null,
            dateTo: null,
            autoRefreshEnabled: false,
            refreshIntervalMinutes: 30,
            refreshTimer: null,
            feedStatus: {},
            // --- Memoization cache (vanilla equivalent of useMemo) ---
            // Stores last computed filter result keyed by a dependency hash.
            // If hash matches on next applyFilters() call, we skip the O(N log N) sort
            // and the O(N) filter pass entirely.
            _filterCache: { key: null, items: null },
            _datasetVersion: 0, // bumps every time allItems grows
            // Persistent DOM map: itemKey -> HTMLElement. Cards live in the DOM across
            // filter changes; we only toggle a `is-hidden` class instead of recreating
            // 300+ elements on every keystroke. This is the vanilla equivalent of
            // React.memo with a stable key prop.
            _cardNodes: new Map(),
            // Frame coalescing handle for batched renders.
            _renderRaf: null,
            // Tracks whether init has already wired window-level listeners so we
            // never double-bind across hot-reloads or duplicate inits.
            _listenersWired: false,
            sidebarCollapsed: true,
            _selectedCardKey: null,
            _keyboardIndex: -1,
            _fastBoot: true,
            _lazyArchiveReady: false,
            _lazyBuildHandle: null,
            _lazyArchivePending: false,
            _lazyGeneration: 0,
            _snapshotGeneratedAt: null,
            _liveFeedRefresh: false
        };

        // ============================================================
        // PERF: tiny scheduler. Coalesce multiple state changes into a
        // single render per frame (rAF) so rapid checkbox toggles don't
        // trigger 5 synchronous filter+render passes back-to-back.
        // ============================================================
        function scheduleRender() {
            if (state._renderRaf != null) return;
            state._renderRaf = requestAnimationFrame(() => {
                state._renderRaf = null;
                applyFilters();
            });
        }

        // Polyfill: requestIdleCallback isn't available in Safari. Falls back to
        // a 16ms setTimeout so background work (initial card materialisation,
        // sidebar build) still yields to the main thread for input handling.
        const rIC = window.requestIdleCallback
            ? window.requestIdleCallback.bind(window)
            : (cb) => setTimeout(() => cb({ timeRemaining: () => 8, didTimeout: false }), 16);

        // DOM refs — resolved inside .stay-updated-dashboard (see resolveDashboardElements).
        const elements = {};

        function resolveDashboardElements() {
            const root = document.querySelector('.stay-updated-dashboard[data-app="stay-updated"]');
            if (!root) return false;

            const byId = (id) => root.querySelector('#' + id);

            elements.feedContainer = byId('feed-container');
            elements.lastUpdated = byId('lastUpdated');
            elements.loadingMessage = byId('loadingMessage');
            elements.errorMessage = byId('errorMessage');
            elements.retryButton = byId('retryButton');
            elements.toggleButton = byId('toggleButton');
            elements.arrowIcon = byId('arrowIcon');
            elements.searchInput = byId('search-input');
            elements.sortSelect = byId('sortSelect');
            elements.dateFilter = byId('dateFilter');
            elements.dateFrom = byId('dateFrom');
            elements.dateTo = byId('dateTo');
            elements.customDateRange = byId('customDateRange');
            elements.sourceFilters = byId('sourceFilters');
            elements.sourceSearch = byId('sourceSearch');
            elements.sourceFilterCount = byId('sourceFilterCount');
            elements.selectAllSources = byId('selectAllSources');
            elements.deselectAllSources = byId('deselectAllSources');
            elements.expandAllCategories = byId('expandAllCategories');
            elements.collapseAllCategories = byId('collapseAllCategories');
            elements.exportBtn = byId('exportBtn');
            elements.clearFiltersBtn = byId('clearFiltersBtn');
            elements.helpBtn = byId('helpBtn');
            elements.loadingProgress = byId('loadingProgress');
            elements.loadingStatus = byId('loadingStatus');
            elements.totalCount = byId('totalCount');
            elements.showingCount = byId('showingCount');
            elements.sourceCount = byId('sourceCount');
            elements.autoRefreshToggle = byId('autoRefreshToggle');
            elements.refreshInterval = byId('refreshInterval');
            elements.refreshIntervalSelect = byId('refreshIntervalSelect');

            return !!elements.feedContainer;
        }

        function getRefreshIntervalMs() {
            const mins = Number(state.refreshIntervalMinutes) || 30;
            return Math.max(5, mins) * 60 * 1000;
        }

        // Utility functions
        function sanitizeHtml(html) {
            if (!html) return "";
            try {
                const template = document.createElement('template');
                template.innerHTML = html;
                return template.content.textContent || "";
            } catch (e) {
                // Fallback for invalid HTML
                return String(html).replace(/<[^>]*>/g, '');
            }
        }

        function escapeHtml(str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        function bindClickableAction(el, handler) {
            if (!el) return;
            el.addEventListener('click', handler);
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handler(e);
                }
            });
        }

        function getRelativeTime(date) {
            try {
                const now = new Date();
                const itemDate = new Date(date);
                
                // Handle invalid dates
                if (isNaN(itemDate.getTime())) {
                    return 'Date unknown';
                }
                
                // Handle future dates
                if (itemDate > now) {
                    return 'Just now';
                }
                
                const diff = now - itemDate;
                const seconds = Math.floor(diff / 1000);
                const minutes = Math.floor(seconds / 60);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);

                if (days > 7) return itemDate.toLocaleDateString();
                if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
                if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
                if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
                return 'Just now';
            } catch (e) {
                return 'Date unknown';
            }
        }

        function estimateReadingTime(text) {
            if (!text) return null;
            const wordsPerMinute = 200;
            const wordCount = text.split(/\s+/).filter(Boolean).length;
            if (!wordCount) return null;
            const minutes = Math.ceil(wordCount / wordsPerMinute);
            return minutes <= 1 ? '1 min read' : `${minutes} min read`;
        }

        function isArticleNew(pubDate) {
            try {
                const d = pubDate instanceof Date ? pubDate : new Date(pubDate);
                if (Number.isNaN(d.getTime())) return false;
                return Date.now() - d.getTime() < 60 * 60 * 1000;
            } catch {
                return false;
            }
        }

        function buildFaviconSrc(sourceName) {
            return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(getSourceDomain(sourceName))}&sz=64`;
        }

        function getSourceDomain(sourceName) {
            const feed = rssFeeds.find((f) => f.name === sourceName);
            if (feed?.url) {
                try {
                    return new URL(feed.url).hostname;
                } catch { /* fall through */ }
            }
            const sample = state.allItems.find((it) => it.sourceName === sourceName && it.link);
            if (sample?.link) {
                try {
                    return new URL(sample.link).hostname;
                } catch { /* fall through */ }
            }
            return 'example.com';
        }

        function copyToClipboard(text, message) {
            navigator.clipboard.writeText(text).then(() => {
                showNotification(message || 'Copied to clipboard!');
            }).catch(() => {
                // Fallback
                const textarea = document.createElement('textarea');
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                showNotification(message || 'Copied to clipboard!');
            });
        }

        function shareArticle(item) {
            if (navigator.share) {
                navigator.share({
                    title: item.title,
                    text: item.description || '',
                    url: item.link
                }).catch(() => {});
            } else {
                copyToClipboard(item.link, 'Article link copied!');
            }
        }

        // Enhanced notification system with types and better UX
        function showNotification(message, type = 'info', duration = 3000) {
            // Remove existing notifications to prevent stacking
            const existingNotifications = document.querySelectorAll('.notification-toast');
            existingNotifications.forEach(n => {
                n.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => n.remove(), 300);
            });

            const notification = document.createElement('div');
            notification.className = 'notification-toast';
            notification.setAttribute('role', 'alert');
            notification.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
            
            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };
            
            const colors = {
                success: 'var(--success-color)',
                error: 'var(--error-color)',
                warning: 'var(--warning-color)',
                info: 'var(--highlight-color)'
            };
            
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--gradient-card);
                color: var(--text-color);
                padding: 16px 20px;
                border-radius: 12px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px ${colors[type]}, inset 0 1px 0 rgba(255, 255, 255, 0.1);
                border: 1.5px solid ${colors[type]};
                z-index: 10000;
                animation: slideInFromTop 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                max-width: 400px;
                display: flex;
                align-items: center;
                gap: 12px;
                font-weight: 500;
            `;
            
            notification.innerHTML = `
                <span style="font-size: 1.2em; flex-shrink: 0;">${icons[type] || icons.info}</span>
                <span style="flex: 1;">${message}</span>
            `;
            
            document.body.appendChild(notification);
            
            // Auto-dismiss
            const timeout = setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, duration);
            
            // Allow manual dismiss on click
            notification.style.cursor = 'pointer';
            notification.addEventListener('click', () => {
                clearTimeout(timeout);
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            });
            
            // Add hover effect
            notification.addEventListener('mouseenter', () => {
                notification.style.transform = 'translateY(-2px)';
                notification.style.boxShadow = `0 12px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px ${colors[type]}, inset 0 1px 0 rgba(255, 255, 255, 0.15)`;
            });
            
            notification.addEventListener('mouseleave', () => {
                notification.style.transform = 'translateY(0)';
                notification.style.boxShadow = `0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px ${colors[type]}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`;
            });
        }

        function extractSourceName(item) {
            try {
                if (item.link) {
                    const hostname = new URL(item.link).hostname.replace('www.', '');
                    return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
                }
            } catch (e) {
                // Fallback to feed name if available
            }
            return 'Unknown';
        }

        const OG_IMAGE_CACHE_KEY = 'su_og_image_cache_v1';
        const OG_IMAGE_PROXY = 'https://opengraph.githubassets.com/1/';
        const OG_FETCH_CONCURRENCY = 4;
        const _ogFetchQueue = [];
        let _ogFetchActive = 0;
        let _thumbObserver = null;

        function readOgImageCache() {
            try {
                const raw = localStorage.getItem(OG_IMAGE_CACHE_KEY);
                return raw ? JSON.parse(raw) : {};
            } catch {
                return {};
            }
        }

        function writeOgImageCacheEntry(articleUrl, imageUrl) {
            if (!articleUrl || !imageUrl) return;
            try {
                const cache = readOgImageCache();
                cache[articleUrl] = { url: imageUrl, t: Date.now() };
                const keys = Object.keys(cache);
                if (keys.length > 400) {
                    keys.sort((a, b) => (cache[a].t || 0) - (cache[b].t || 0));
                    keys.slice(0, keys.length - 400).forEach((k) => delete cache[k]);
                }
                localStorage.setItem(OG_IMAGE_CACHE_KEY, JSON.stringify(cache));
            } catch {}
        }

        function getCachedOgImage(articleUrl) {
            if (!articleUrl) return null;
            const hit = readOgImageCache()[articleUrl];
            return hit?.url || null;
        }

        function isValidHttpUrl(url) {
            try {
                const u = new URL(url);
                return u.protocol === 'http:' || u.protocol === 'https:';
            } catch {
                return false;
            }
        }

        /** Skip favicons, emoji sprites, tiny brand icons — they blow up in the card hero. */
        function isUsableCardThumbnail(url) {
            if (!url || !isValidHttpUrl(url)) return false;
            const u = url.toLowerCase();
            if (/\.(svg|ico)(\?|$)/i.test(u)) return false;
            if (/emoji|favicon|apple-touch|site-icon|avatar|gravatar|1x1|pixel\.gif|spacer|transparent\.png|badge|web-onboard|githubassets\.com\/images\/modules|opengraph\.jpg|logo[-_]?only/i.test(u)) {
                return false;
            }
            const widthParam = u.match(/(?:[?&](?:w|width)=)(\d+)/);
            if (widthParam && parseInt(widthParam[1], 10) < 120) return false;
            const maxSeg = u.match(/\/max\/(\d+)/i);
            if (maxSeg && parseInt(maxSeg[1], 10) < 200) return false;
            return true;
        }

        function extractImageUrl(item) {
            try {
                const candidates = [
                    item.imageUrl,
                    item.ogImage,
                    item.thumbnail,
                    item.enclosure?.link,
                    item.enclosure?.url
                ];
                for (const url of candidates) {
                    if (url && isUsableCardThumbnail(url)) return url;
                }

                const desc = item.description || item.content || '';
                const imgMatch = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
                if (imgMatch?.[1] && isUsableCardThumbnail(imgMatch[1]) && !/pixel|tracking|1x1|spacer/i.test(imgMatch[1])) {
                    return imgMatch[1];
                }
            } catch {}
            return null;
        }

        function buildOgProxyUrl(articleUrl) {
            if (!isValidHttpUrl(articleUrl)) return null;
            return OG_IMAGE_PROXY + encodeURIComponent(articleUrl);
        }

        function resolveCardThumbnailUrl(item) {
            const direct = extractImageUrl(item);
            if (direct) return direct;
            if (item._ogImage && isUsableCardThumbnail(item._ogImage)) return item._ogImage;
            const cached = getCachedOgImage(item.link);
            if (cached && isUsableCardThumbnail(cached)) {
                item._ogImage = cached;
                return cached;
            }
            return null;
        }

        function rejectTinyCardImage(img, mediaEl, sourceName) {
            if (!img || !mediaEl) return;
            const w = img.naturalWidth || 0;
            const h = img.naturalHeight || 0;
            if ((w > 0 && w < 120) || (h > 0 && h < 80)) {
                replaceMediaWithPlaceholder(mediaEl, sourceName);
            }
        }

        function setArticleCardMediaImage(mediaEl, imageUrl, sourceName) {
            if (!mediaEl || !imageUrl) return;
            const existing = mediaEl.querySelector('img.article-card__media-img');
            if (existing?.src === imageUrl) return;

            mediaEl.innerHTML = '';
            mediaEl.removeAttribute('data-placeholder');
            const img = document.createElement('img');
            img.className = 'article-card__media-img';
            img.src = imageUrl;
            img.alt = '';
            img.loading = 'lazy';
            img.decoding = 'async';
            const srcName = sourceName || mediaEl.closest('.article-card')?.dataset?.source || 'Unknown';
            img.addEventListener('error', () => {
                replaceMediaWithPlaceholder(mediaEl, srcName);
            }, { once: true });
            img.addEventListener('load', () => {
                rejectTinyCardImage(img, mediaEl, srcName);
            }, { once: true });
            mediaEl.appendChild(img);
            mediaEl.dataset.hasImage = '1';
        }

        function replaceMediaWithPlaceholder(mediaEl, sourceName) {
            if (!mediaEl) return;
            mediaEl.removeAttribute('data-has-image');
            mediaEl.removeAttribute('data-ogQueued');
            mediaEl.dataset.placeholder = '1';
            mediaEl.innerHTML = '';
            const wrap = document.createElement('div');
            wrap.className = 'article-card__media-placeholder';
            wrap.setAttribute('aria-hidden', 'true');
            const fav = document.createElement('img');
            fav.className = 'article-card__media-favicon';
            fav.src = buildFaviconSrc(sourceName || 'Unknown');
            fav.alt = '';
            fav.width = 40;
            fav.height = 40;
            fav.loading = 'lazy';
            fav.decoding = 'async';
            wrap.appendChild(fav);
            mediaEl.appendChild(wrap);
        }

        async function fetchOgImageViaMicrolink(articleUrl) {
            if (!isValidHttpUrl(articleUrl)) return null;
            try {
                const api = `https://api.microlink.io/?url=${encodeURIComponent(articleUrl)}&screenshot=false&video=false&audio=false`;
                const res = await fetch(api);
                if (!res.ok) return null;
                const json = await res.json();
                const url = json?.data?.image?.url;
                return url && isValidHttpUrl(url) ? url : null;
            } catch {
                return null;
            }
        }

        function finishOgThumbnailJob(job, imageUrl) {
            if (imageUrl && isUsableCardThumbnail(imageUrl)) {
                job.item._ogImage = imageUrl;
                job.item.imageUrl = imageUrl;
                writeOgImageCacheEntry(job.item.link, imageUrl);
                if (job.mediaEl?.isConnected) {
                    setArticleCardMediaImage(job.mediaEl, imageUrl, job.item.sourceName);
                }
            } else if (job.mediaEl?.isConnected) {
                job.mediaEl.dataset.ogFailed = '1';
                replaceMediaWithPlaceholder(job.mediaEl, job.item.sourceName);
            }
            _ogFetchActive--;
            pumpOgFetchQueue();
        }

        function pumpOgFetchQueue() {
            while (_ogFetchActive < OG_FETCH_CONCURRENCY && _ogFetchQueue.length) {
                const job = _ogFetchQueue.shift();
                if (!job) continue;
                _ogFetchActive++;
                const proxyUrl = buildOgProxyUrl(job.item.link);
                if (!proxyUrl) {
                    finishOgThumbnailJob(job, null);
                    continue;
                }
                const probe = new Image();
                probe.onload = () => finishOgThumbnailJob(job, proxyUrl);
                probe.onerror = () => {
                    fetchOgImageViaMicrolink(job.item.link).then((url) => finishOgThumbnailJob(job, url));
                };
                probe.src = proxyUrl;
            }
        }

        function queueOgThumbnailFetch(item, mediaEl) {
            if (!item?.link || !mediaEl || mediaEl.dataset.hasImage === '1') return;
            if (mediaEl.dataset.ogQueued === '1' || mediaEl.dataset.ogFailed === '1') return;
            if (resolveCardThumbnailUrl(item)) return;

            mediaEl.dataset.ogQueued = '1';
            _ogFetchQueue.push({ item, mediaEl });
            pumpOgFetchQueue();
        }

        function ensureThumbnailObserver() {
            if (_thumbObserver || !elements.feedContainer) return;
            _thumbObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const mediaEl = entry.target;
                    const card = mediaEl.closest('.article-card');
                    if (!card) return;
                    const key = card.dataset.key;
                    const item = state.allItems.find((it) => it._key === key)
                        || state.filteredItems.find((it) => it._key === key);
                    if (!item) return;
                    const url = resolveCardThumbnailUrl(item);
                    if (url) {
                        setArticleCardMediaImage(mediaEl, url, item.sourceName);
                    } else {
                        queueOgThumbnailFetch(item, mediaEl);
                    }
                    _thumbObserver.unobserve(mediaEl);
                });
            }, { rootMargin: '120px 0px', threshold: 0.01 });
        }

        function observeCardMedia(mediaEl, item) {
            if (!mediaEl) return;
            ensureThumbnailObserver();
            const url = resolveCardThumbnailUrl(item);
            if (url) {
                setArticleCardMediaImage(mediaEl, url, item.sourceName);
                return;
            }
            if (!mediaEl.dataset.placeholder) {
                replaceMediaWithPlaceholder(mediaEl, item.sourceName);
            }
            if (_thumbObserver) {
                _thumbObserver.observe(mediaEl);
            } else {
                queueOgThumbnailFetch(item, mediaEl);
            }
        }

        function getCategoryShortLabel(categoryKey) {
            const cat = sourceCategories[categoryKey];
            if (cat?.shortName) return cat.shortName;
            if (categoryKey === 'other') return 'Other';
            return categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
        }

        // Storage management
        function saveToStorage(key, data) {
            try {
                localStorage.setItem(key, JSON.stringify({
                    data,
                    timestamp: Date.now()
                }));
            } catch (e) {
                // Handle quota exceeded or other storage errors gracefully
                if (e.name === 'QuotaExceededError') {
                    // Clear old cache if storage is full
                    try {
                        const keys = Object.keys(localStorage);
                        keys.filter(k => k.startsWith('feed_')).forEach(k => {
                            const item = localStorage.getItem(k);
                            if (item) {
                                try {
                                    const parsed = JSON.parse(item);
                                    const age = Date.now() - parsed.timestamp;
                                    if (age > CONFIG.CACHE_DURATION) {
                                        localStorage.removeItem(k);
                                    }
                                } catch {}
                            }
                        });
                        // Retry once
                        localStorage.setItem(key, JSON.stringify({
                            data,
                            timestamp: Date.now()
                        }));
                    } catch (retryError) {
                        // Silently fail - cache is not critical
                        if (window.location.hostname === 'localhost') {
                            console.warn('Failed to save to localStorage after cleanup:', retryError);
                        }
                    }
                } else if (window.location.hostname === 'localhost') {
                    console.warn('Failed to save to localStorage:', e);
                }
            }
        }

        const SNAPSHOT_KEY = 'stayupdated_snapshot';

        function saveSnapshot() {
            if (!state.allItems.length) return;
            try {
                const items = state.allItems.map((item) => ({
                    title: item.title,
                    link: item.link,
                    description: item.description,
                    guid: item.guid,
                    sourceName: item.sourceName,
                    sourceUrl: item.sourceUrl,
                    pubDate: item.pubDate instanceof Date ? item.pubDate.toISOString() : item.pubDate,
                    _searchText: item._searchText,
                    _key: item._key
                }));
                saveToStorage(SNAPSHOT_KEY, { items });
            } catch (e) {
                if (window.location.hostname === 'localhost') {
                    console.warn('[StayUpdated] saveSnapshot failed:', e);
                }
            }
        }

        function hydrateFeedItem(item) {
            const pubDate = item.pubDate instanceof Date ? item.pubDate : new Date(item.pubDate);
            const safeTitle = sanitizeHtml(item.title || '');
            const safeDesc = sanitizeHtml(item.description || item.content || '');
            const sourceName = item.sourceName || 'Unknown';
            const _searchText = item._searchText
                || (safeTitle + ' ' + safeDesc + ' ' + sourceName).toLowerCase();
            const _key = item._key
                || String(item.guid || item.link || (sourceName + '|' + safeTitle)).slice(0, 200);
            const _severity = item._severity || detectThreatSeverity(safeTitle, safeDesc);
            return {
                ...item,
                title: item.title,
                link: item.link || '',
                description: item.description || item.content || '',
                guid: item.guid,
                sourceName,
                sourceUrl: item.sourceUrl || '',
                pubDate: Number.isNaN(pubDate.getTime()) ? new Date() : pubDate,
                _searchText,
                _key,
                _severity
            };
        }

        function getSnapshotUrl() {
            const root = dashboardRoot();
            return root?.dataset?.snapshotUrl || '';
        }

        function isStaticSnapshotStale(generatedAt) {
            if (!generatedAt) return true;
            const t = new Date(generatedAt).getTime();
            if (Number.isNaN(t)) return true;
            return Date.now() - t > CONFIG.SNAPSHOT_MAX_AGE_MS;
        }

        function updateFeedStatusLine(snapshotData, live) {
            if (!elements.lastUpdated) return;
            if (live) {
                const updateTime = new Date().toLocaleString();
                elements.lastUpdated.textContent = `Live · ${updateTime}`;
                elements.lastUpdated.setAttribute('title', `Live refresh at ${updateTime}`);
                return;
            }
            if (!snapshotData?.generatedAt) return;
            const when = new Date(snapshotData.generatedAt);
            const rel = getRelativeTime(when);
            const errN = (snapshotData.feedErrors || []).length;
            let text = `Snapshot · ${rel}`;
            if (errN) text += ` · ${errN} feed${errN > 1 ? 's' : ''} skipped`;
            elements.lastUpdated.textContent = text;
            elements.lastUpdated.setAttribute('title', `Snapshot built ${when.toLocaleString()}`);
        }

        function applyStaticSnapshotData(data) {
            state.allItems = [];
            state.feedStatus = {};
            const okSources = new Set();

            (data.items || []).forEach((raw) => {
                if (!raw?.title) return;
                const item = hydrateFeedItem(raw);
                state.allItems.push(item);
                if (item.sourceName) okSources.add(item.sourceName);
            });

            okSources.forEach((name) => { state.feedStatus[name] = 'success'; });
            (data.feedErrors || []).forEach((err) => {
                if (err?.name) state.feedStatus[err.name] = 'error';
            });

            state._datasetVersion++;
            state._filterCache.key = null;
            state._snapshotGeneratedAt = data.generatedAt || null;
            state._liveFeedRefresh = false;
            syncSelectedSourcesWithData();
            return state.allItems.length > 0;
        }

        async function loadStaticSnapshot(options = {}) {
            const url = getSnapshotUrl();
            if (!url) {
                return null;
            }
            try {
                const absoluteUrl = new URL(url, window.location.href).href;
                const res = await fetch(absoluteUrl, {
                    cache: options.bypassCache ? 'no-store' : 'default'
                });
                if (!res.ok) {
                    return null;
                }
                const data = await res.json();
                if (!data?.items?.length) {
                    return null;
                }
                if (!applyStaticSnapshotData(data)) {
                    return null;
                }
                return data;
            } catch (err) {
                return null;
            }
        }

        function restoreSnapshot() {
            const snap = loadFromStorage(SNAPSHOT_KEY);
            if (!snap?.items?.length) return false;
            try {
                state.allItems = snap.items.map((item) => hydrateFeedItem(item));
                state._datasetVersion++;
                state._filterCache.key = null;
                snap.items.forEach((item) => {
                    if (item.sourceName) state.feedStatus[item.sourceName] = 'success';
                });
                state._liveFeedRefresh = true;
                syncSelectedSourcesWithData();
                return true;
            } catch (e) {
                return false;
            }
        }

        function setLoadingVisible(show) {
            if (!elements.loadingMessage) return;
            elements.loadingMessage.hidden = !show;
            elements.loadingMessage.style.display = show ? 'flex' : 'none';
        }

        function setErrorVisible(show) {
            if (!elements.errorMessage) return;
            elements.errorMessage.hidden = !show;
            elements.errorMessage.style.display = show ? 'block' : 'none';
        }

        function setRetryVisible(show) {
            if (!elements.retryButton) return;
            elements.retryButton.hidden = !show;
            elements.retryButton.style.display = show ? 'block' : 'none';
        }

        function setFeedSkeletonVisible(show) {
            if (!elements.feedContainer) return;
            const existing = elements.feedContainer.querySelector('.su-feed-skeleton');
            if (!show) {
                existing?.remove();
                return;
            }
            if (existing) return;
            const wrap = document.createElement('div');
            wrap.className = 'su-feed-skeleton';
            wrap.setAttribute('aria-hidden', 'true');
            for (let i = 0; i < 6; i++) {
                const card = document.createElement('div');
                card.className = 'su-skeleton-card';
                wrap.appendChild(card);
            }
            elements.feedContainer.appendChild(wrap);
        }

        function clearFeedSkeleton() {
            elements.feedContainer?.querySelector('.su-feed-skeleton')?.remove();
        }

        function loadFromStorage(key) {
            try {
                const stored = localStorage.getItem(key);
                if (!stored) return null;
                
                const parsed = JSON.parse(stored);
                const age = Date.now() - parsed.timestamp;
                
                if (age > CONFIG.CACHE_DURATION) {
                    localStorage.removeItem(key);
                    return null;
                }
                
                return parsed.data;
            } catch (e) {
                // Silently handle corrupted data
                try {
                    localStorage.removeItem(key);
                } catch {}
                if (window.location.hostname === 'localhost') {
                    console.warn('Failed to load from localStorage:', e);
                }
                return null;
            }
        }

        const dashboardRoot = () => document.querySelector('.stay-updated-dashboard[data-app="stay-updated"]');
        const SU_MOBILE_MQ = window.matchMedia('(max-width: 900px)');

        function isMobileLayout() {
            return SU_MOBILE_MQ.matches;
        }

        function toggleSourcesSidebar() {
            state.sidebarCollapsed = !state.sidebarCollapsed;
            applySidebarUi();
            savePreferences();
        }

        function applySidebarUi() {
            const root = dashboardRoot();
            const toggleBtn = document.getElementById('sidebarToggleBtn');
            const panelCloseBtn = document.getElementById('sidebarPanelCloseBtn');
            const backdrop = document.getElementById('sidebarBackdrop');
            if (root) {
                root.classList.toggle('is-sidebar-collapsed', state.sidebarCollapsed);
            }
            if (toggleBtn) {
                toggleBtn.setAttribute('aria-expanded', String(!state.sidebarCollapsed));
                toggleBtn.setAttribute(
                    'title',
                    state.sidebarCollapsed ? 'Show sources panel (I)' : 'Hide sources panel (I)'
                );
            }
            if (panelCloseBtn) {
                panelCloseBtn.hidden = state.sidebarCollapsed;
            }
            if (backdrop) {
                backdrop.hidden = state.sidebarCollapsed || !isMobileLayout();
            }
        }

        function collapseSidebarIfMobile() {
            if (isMobileLayout()) {
                state.sidebarCollapsed = true;
                applySidebarUi();
                savePreferences();
            }
        }

        function invalidateFilterCache() {
            state._filterCache = { key: null, items: null };
        }

        /** If the default date window hides every snapshot article, widen to All time. */
        function ensureSnapshotDateFilter() {
            if (!state.allItems.length || state.dateFilter === 'all') return false;
            const dateRange = getDateRange(state.dateFilter);
            if (!dateRange) return false;
            let visible = 0;
            for (let i = 0; i < state.allItems.length; i++) {
                const item = state.allItems[i];
                if (item?.title && isDateInRange(item.pubDate, dateRange)) visible++;
            }
            if (visible > 0) return false;
            state.dateFilter = 'all';
            if (elements.dateFilter) elements.dateFilter.value = 'all';
            if (elements.customDateRange) elements.customDateRange.hidden = true;
            invalidateFilterCache();
            return true;
        }

        function loadPreferences() {
            const prefs = loadFromStorage('feedPreferences');
            if (prefs) {
                state.selectedSources = new Set(prefs.selectedSources || []);
                state.sortBy = prefs.sortBy || 'date-desc';
                state.dateFilter = prefs.dateFilter || '3days';
                state.dateFrom = prefs.dateFrom || null;
                state.dateTo = prefs.dateTo || null;
                state.autoRefreshEnabled = prefs.autoRefreshEnabled === true;
                state.refreshIntervalMinutes = Number(prefs.refreshIntervalMinutes) || 30;
                state.expandedCategories = new Set(prefs.expandedCategories || []);
                state.searchQuery = prefs.searchQuery || '';
                if (typeof prefs.sidebarCollapsed === 'boolean') {
                    state.sidebarCollapsed = prefs.sidebarCollapsed;
                } else {
                    state.sidebarCollapsed = true;
                }

                if (elements.sortSelect) elements.sortSelect.value = state.sortBy;
                if (elements.refreshIntervalSelect) {
                    elements.refreshIntervalSelect.value = String(state.refreshIntervalMinutes);
                }
                if (elements.dateFilter) elements.dateFilter.value = state.dateFilter;
                if (elements.searchInput) elements.searchInput.value = state.searchQuery;
                if (state.dateFilter === 'custom' && elements.customDateRange) {
                    elements.customDateRange.hidden = false;
                    if (state.dateFrom && elements.dateFrom) elements.dateFrom.value = state.dateFrom;
                    if (state.dateTo && elements.dateTo) elements.dateTo.value = state.dateTo;
                }
                if (elements.autoRefreshToggle) {
                    elements.autoRefreshToggle.checked = !!state.autoRefreshEnabled;
                }
            } else if (isMobileLayout()) {
                state.sidebarCollapsed = true;
            }
            applySidebarUi();
        }

        function savePreferences() {
            saveToStorage('feedPreferences', {
                selectedSources: Array.from(state.selectedSources),
                sortBy: state.sortBy,
                dateFilter: state.dateFilter,
                dateFrom: state.dateFrom,
                dateTo: state.dateTo,
                autoRefreshEnabled: state.autoRefreshEnabled,
                refreshIntervalMinutes: state.refreshIntervalMinutes,
                expandedCategories: Array.from(state.expandedCategories || []),
                searchQuery: state.searchQuery,
                sidebarCollapsed: state.sidebarCollapsed
            });
        }

        /* ---- Threat severity (ingest-time) ---- */
        const THREAT_SEVERITY_RULES = [
            { level: 'critical', re: /\b(0-day|0day|zero[- ]?day|critical\s+(rce|vuln|vulnerability)|actively\s+exploited)\b/i },
            { level: 'high', re: /\b(ransomware|\bc2\b|command[- ]and[- ]control|exploited|in the wild|active exploitation)\b/i }
        ];

        function detectThreatSeverity(title, description) {
            const blob = `${title || ''} ${description || ''}`;
            for (const rule of THREAT_SEVERITY_RULES) {
                if (rule.re.test(blob)) return rule.level;
            }
            return null;
        }

        function getThreatBadgeLabel(level) {
            if (level === 'critical') return 'Critical';
            if (level === 'high') return 'Active';
            return '';
        }

        /* ---- Search match highlighting ---- */
        function escapeRegex(str) {
            return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        function setHighlightedText(el, text, query) {
            const plain = text || '';
            const q = (query || '').trim();
            if (!q) {
                el.textContent = plain;
                return;
            }
            const safe = sanitizeHtml(plain);
            try {
                const re = new RegExp(`(${escapeRegex(q)})`, 'gi');
                el.innerHTML = safe.replace(re, '<mark class="search-match">$1</mark>');
            } catch {
                el.textContent = plain;
            }
        }

        /* ---- Keyboard-driven card navigation ---- */
        function isTypingContext(target) {
            if (!target) return false;
            const tag = target.tagName;
            return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
        }

        function getVisibleArticleCards() {
            if (!elements.feedContainer) return [];
            return Array.from(
                elements.feedContainer.querySelectorAll('.article-card:not(.is-hidden)')
            );
        }

        function getArticleLinkFromCard(card) {
            if (!card) return null;
            const anchor = card.querySelector('a.article-card__title-link, a.article-card__link');
            if (anchor?.href && anchor.href !== '#' && !anchor.dataset.invalid) {
                return anchor.href;
            }
            const key = card.dataset.key;
            const item = state.allItems.find((it) => it._key === key);
            if (!item?.link) return null;
            try {
                return new URL(item.link).href;
            } catch {
                return null;
            }
        }

        function openArticleFromCard(card) {
            const url = getArticleLinkFromCard(card);
            if (url) {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        }

        function setCardSelected(cardEl) {
            if (!cardEl) return;
            const key = cardEl.dataset.key;
            if (state._selectedCardKey === key) {
                state._selectedCardKey = null;
                cardEl.classList.remove('is-card-selected');
                cardEl.setAttribute('aria-selected', 'false');
                return;
            }
            elements.feedContainer?.querySelectorAll('.article-card.is-card-selected').forEach((el) => {
                el.classList.remove('is-card-selected');
                el.setAttribute('aria-selected', 'false');
            });
            state._selectedCardKey = key;
            cardEl.classList.add('is-card-selected');
            cardEl.setAttribute('aria-selected', 'true');
        }

        function syncCardSelectionAfterRender() {
            elements.feedContainer?.querySelectorAll('.article-card.is-card-selected').forEach((el) => {
                el.classList.remove('is-card-selected');
                el.setAttribute('aria-selected', 'false');
            });
            if (!state._selectedCardKey || !elements.feedContainer) return;
            const selected = Array.from(
                elements.feedContainer.querySelectorAll('.article-card:not(.is-hidden)')
            ).find((el) => el.dataset.key === state._selectedCardKey);
            if (selected && !selected.classList.contains('is-hidden')) {
                selected.classList.add('is-card-selected');
                selected.setAttribute('aria-selected', 'true');
            } else {
                state._selectedCardKey = null;
            }
        }

        function clearKeyboardCardFocus() {
            elements.feedContainer?.querySelectorAll('.article-card.is-keyboard-focused').forEach((el) => {
                el.classList.remove('is-keyboard-focused');
            });
            detachKeyboardHints();
        }

        function setKeyboardCardFocus(index) {
            const cards = getVisibleArticleCards();
            clearKeyboardCardFocus();
            if (!cards.length) {
                state._keyboardIndex = -1;
                return;
            }
            const clamped = Math.max(0, Math.min(index, cards.length - 1));
            state._keyboardIndex = clamped;
            const card = cards[clamped];
            card.classList.add('is-keyboard-focused');
            attachKeyboardHint(card);
            card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }

        function attachKeyboardHint(card) {
            if (!card) return;
            let hint = card.querySelector('.article-card__keyhint');
            if (!hint) {
                hint = document.createElement('span');
                hint.className = 'article-card__keyhint';
                hint.setAttribute('aria-hidden', 'true');
                card.appendChild(hint);
            }
            hint.textContent = 'J/K';
        }

        function detachKeyboardHints() {
            elements.feedContainer?.querySelectorAll('.article-card__keyhint').forEach((h) => h.remove());
        }

        function moveKeyboardCardFocus(delta) {
            const cards = getVisibleArticleCards();
            if (!cards.length) return;
            const next = state._keyboardIndex < 0
                ? (delta > 0 ? 0 : cards.length - 1)
                : state._keyboardIndex + delta;
            setKeyboardCardFocus(next);
        }

        function openKeyboardFocusedCard() {
            const cards = getVisibleArticleCards();
            if (state._keyboardIndex < 0 || !cards[state._keyboardIndex]) return;
            openArticleFromCard(cards[state._keyboardIndex]);
        }

        function focusMainSearch(fromHotkey) {
            if (!elements.searchInput) return;
            elements.searchInput.focus();
            elements.searchInput.select();
            if (fromHotkey) elements.searchInput.classList.add('is-hotkey-focus');
        }

        function blurMainSearch() {
            if (!elements.searchInput) return;
            elements.searchInput.classList.remove('is-hotkey-focus');
            elements.searchInput.blur();
        }

        function syncKeyboardFocusAfterRender() {
            const cards = getVisibleArticleCards();
            if (!cards.length) {
                state._keyboardIndex = -1;
                clearKeyboardCardFocus();
                return;
            }
            if (state._keyboardIndex >= cards.length) {
                setKeyboardCardFocus(cards.length - 1);
            } else if (state._keyboardIndex >= 0) {
                setKeyboardCardFocus(state._keyboardIndex);
            }
        }

        // Feed fetching
        // Fetch with timeout
        async function fetchWithTimeout(url, timeout = CONFIG.FETCH_TIMEOUT) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            try {
                const response = await fetch(url, { 
                    signal: controller.signal,
                    cache: 'no-cache'
                });
                clearTimeout(timeoutId);
                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout');
                }
                throw error;
            }
        }

        // Safe cache key generation
        function getCacheKey(url) {
            try {
                // Use btoa for ASCII-safe URLs, fallback to encoded string
                return `feed_${btoa(url).replace(/[+/=]/g, '')}`;
            } catch (e) {
                // Fallback for URLs with special characters
                return `feed_${encodeURIComponent(url).replace(/[^a-zA-Z0-9]/g, '_')}`;
            }
        }

        async function fetchFeed(feedConfig, useCache = true, options = {}) {
            const silent = options.silent === true;
            const cacheKey = getCacheKey(feedConfig.url);
            const cached = loadFromStorage(cacheKey);
            
            // Return cached data immediately if available and using cache
            if (useCache && cached) {
                return { ...cached, source: feedConfig.name, cached: true };
            }

            try {
                const response = await fetchWithTimeout(
                    `${CONFIG.PROXY_URL}${encodeURIComponent(feedConfig.url)}`,
                    CONFIG.FETCH_TIMEOUT
                );
                
                if (!response.ok) {
                    if (response.status === 429) {
                        state._rateLimited = true;
                    }
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.status === 'ok' && data.items) {
                    const feedData = {
                        status: 'ok',
                        items: data.items.slice(0, CONFIG.MAX_ITEMS_PER_FEED),
                        source: feedConfig.name,
                        url: feedConfig.url,
                        cached: false
                    };
                    
                    saveToStorage(cacheKey, feedData);
                    state.feedStatus[feedConfig.name] = 'success';
                    return feedData;
                } else {
                    throw new Error('Invalid feed response');
                }
            } catch (error) {
                const is429 = String(error?.message || '').includes('429');
                const shouldLog = !silent && !is429
                    && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
                if (shouldLog) {
                    console.error(`Error fetching feed: ${feedConfig.name}`, error);
                }
                state.feedStatus[feedConfig.name] = 'error';
                
                // Return cached data as fallback if available
                if (cached) {
                    return { ...cached, source: feedConfig.name, cached: true, fallback: true };
                }
                
                return {
                    status: 'error',
                    source: feedConfig.name,
                    url: feedConfig.url,
                    error: error.message
                };
            }
        }

        // Process feed result and update UI immediately
        let filterUpdateTimer = null;
        function processFeedResult(result, updateUI = true) {
            if (result && result.status === 'ok' && Array.isArray(result.items)) {
                try {
                    result.items.forEach(item => {
                        if (item && item.title) { // Only process valid items
                            const sourceName = result.source || 'Unknown';
                            const pubDate = (() => {
                                try {
                                    const date = new Date(item.pubDate);
                                    return isNaN(date.getTime()) ? new Date() : date;
                                } catch {
                                    return new Date();
                                }
                            })();
                            // PERF: precompute search corpus ONCE per item at ingest time.
                            // Previously applyFilters() ran sanitizeHtml + toLowerCase on
                            // every title+description for EVERY keystroke (≈600 string
                            // allocations per keypress at 300 items). Doing it once here
                            // collapses the search filter to a pure substring check.
                            const safeTitle = sanitizeHtml(item.title || '');
                            const safeDesc = sanitizeHtml(item.description || '');
                            const _searchText = (safeTitle + ' ' + safeDesc + ' ' + sourceName).toLowerCase();
                            // Stable identity key for DOM diffing (vanilla React.memo equivalent).
                            const _key = (item.guid || item.link || (sourceName + '|' + safeTitle)).slice(0, 200);
                            const _severity = detectThreatSeverity(safeTitle, safeDesc);
                            state.allItems.push({
                                ...item,
                                sourceName,
                                sourceUrl: result.url || '',
                                pubDate,
                                _searchText,
                                _key,
                                _severity
                            });
                        }
                    });
                    state._datasetVersion++;
                    state._filterCache.key = null; // invalidate memo

                    // Debounce UI updates to avoid excessive re-renders during bulk ingest.
                    if (updateUI && state.allItems.length > 0) {
                        clearTimeout(filterUpdateTimer);
                        filterUpdateTimer = setTimeout(() => {
                            scheduleRender();
                        }, 100);
                    }
                } catch (e) {
                    if (window.location.hostname === 'localhost') {
                        console.warn('Error processing feed result:', e);
                    }
                }
            }
        }

        // Batch processing with concurrency control
        async function processBatch(feeds, batchSize = CONFIG.CONCURRENT_FEEDS) {
            const batches = [];
            for (let i = 0; i < feeds.length; i += batchSize) {
                batches.push(feeds.slice(i, i + batchSize));
            }
            
            for (const batch of batches) {
                await Promise.allSettled(
                    batch.map(async (feed) => {
                        try {
                            const result = await fetchFeed(feed, false); // Don't use cache for fresh fetch
                            processFeedResult(result);
                            return result;
                        } catch (error) {
                            // Only log errors in development
                            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                                console.error(`Error in batch processing: ${feed.name}`, error);
                            }
                            return { status: 'error', source: feed.name, error: error.message };
                        }
                    })
                );
            }
        }

        async function fetchAllFeeds(options = {}) {
            const hardRefresh = options.hardRefresh === true;
            const background = options.background === true;
            const hadItems = state.allItems.length > 0;
            let preservedItems = null;

            if (hardRefresh) {
                if (elements.feedContainer) elements.feedContainer.innerHTML = '';
                state._cardNodes.clear();
                state.allItems = [];
                state.feedStatus = {};
                state._lazyGeneration += 1;
                state._lazyArchiveReady = false;
                state._fastBoot = true;
                state._lazyBuildHandle = null;
                state._lazyArchivePending = false;
            } else if (background && hadItems) {
                preservedItems = state.allItems.slice();
                state.allItems = [];
                state.feedStatus = {};
                invalidateFilterCache();
            } else if (!hadItems) {
                if (elements.feedContainer) elements.feedContainer.innerHTML = '';
                state._cardNodes.clear();
                state.allItems = [];
                state.feedStatus = {};
            } else {
                state.allItems = [];
                state.feedStatus = {};
            }

            state._liveFeedRefresh = true;
            state._rateLimited = false;
            setLoadingVisible((!hadItems || hardRefresh) && !background);
            setErrorVisible(false);
            setRetryVisible(false);

            const total = rssFeeds.length;
            let completed = 0;
            let loadedFromCache = 0;

            // Step 1: Load cached feeds immediately for instant display
            if (CONFIG.USE_CACHE_FIRST) {
                const cachedFeeds = [];
                rssFeeds.forEach(feed => {
                    const cacheKey = getCacheKey(feed.url);
                    const cached = loadFromStorage(cacheKey);
                    if (cached) {
                        cachedFeeds.push({ ...cached, source: feed.name, cached: true });
                        loadedFromCache++;
                    }
                });

                // Process cached feeds immediately
                cachedFeeds.forEach(result => {
                    processFeedResult(result);
                    completed++;
                    state.feedStatus[result.source] = 'success';
                });

                // Update UI with cached data
                if (state.allItems.length > 0) {
                    syncSelectedSourcesWithData();
                    savePreferences();
                    if (elements.sourceFilters) elements.sourceFilters.dataset.built = '';
                    initializeSourceFilters();
                    scheduleRender();
                    if (elements.loadingStatus) {
                        elements.loadingStatus.textContent = `Loaded ${loadedFromCache} from cache. Fetching fresh data...`;
                    }
                }
            }

            // Step 2: Load fresh feeds in batches with progress updates
            const updateProgress = () => {
                const progress = Math.round((completed / total) * 100);
                if (elements.loadingProgress) {
                    elements.loadingProgress.style.width = `${progress}%`;
                    const progressBar = elements.loadingProgress.closest('[role="progressbar"]');
                    if (progressBar) {
                        progressBar.setAttribute('aria-valuenow', progress);
                        progressBar.setAttribute('aria-label', `Loading progress: ${progress}%`);
                    }
                }
                if (elements.loadingStatus) {
                    const remaining = total - completed;
                    elements.loadingStatus.textContent = loadedFromCache > 0 
                        ? `Loaded ${loadedFromCache} from cache. Fetching fresh data... (${completed}/${total}, ${remaining} remaining)`
                        : `Loading feeds... (${completed}/${total}, ${remaining} remaining)`;
                }
            };

            // Process feeds in batches
            const batches = [];
            for (let i = 0; i < rssFeeds.length; i += CONFIG.CONCURRENT_FEEDS) {
                batches.push(rssFeeds.slice(i, i + CONFIG.CONCURRENT_FEEDS));
            }

            for (const batch of batches) {
                if (state._rateLimited) break;
                const batchPromises = batch.map(async (feed) => {
                    try {
                        const result = await fetchFeed(feed, false, { silent: background });
                        completed++;
                        updateProgress();
                        
                        // Only process if it's new data (not already in cache)
                        if (!result.cached || result.fallback) {
                            processFeedResult(result);
                        }
                        
                        return result;
                    } catch (error) {
                        completed++;
                        updateProgress();
                        const is429 = String(error?.message || '').includes('429');
                        if (!background && !is429
                            && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                            console.error(`Error fetching feed: ${feed.name}`, error);
                        }
                        return { status: 'error', source: feed.name, error: error.message };
                    }
                });

                await Promise.allSettled(batchPromises);
                
                // Small delay between batches to avoid overwhelming the API
                if (batches.indexOf(batch) < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            if (state.allItems.length === 0 && preservedItems?.length) {
                state.allItems = preservedItems;
                state._datasetVersion++;
                invalidateFilterCache();
            }

            setLoadingVisible(false);
            setFeedSkeletonVisible(false);
            updateFeedStatusLine(null, true);
            localStorage.setItem('lastFeedRefresh', Date.now().toString());
            saveSnapshot();

            if (background && state._rateLimited && preservedItems?.length) {
                state.allItems = preservedItems;
                state._datasetVersion++;
                invalidateFilterCache();
                scheduleRender();
            }

            // Show success notification if we loaded new data
            const newItemsCount = state.allItems.length;
            const uniqueSourcesCount = new Set(state.allItems.map(i => i.sourceName)).size;
            
            if (newItemsCount > 0) {
                const cachedCount = loadedFromCache || 0;
                if (cachedCount > 0 && completed > cachedCount) {
                    showNotification(
                        `Loaded ${newItemsCount} articles from ${uniqueSourcesCount} sources (${cachedCount} from cache, ${completed - cachedCount} fresh)`,
                        'success',
                        4000
                    );
                } else if (completed > cachedCount) {
                    showNotification(
                        `Successfully loaded ${newItemsCount} articles from ${uniqueSourcesCount} sources`,
                        'success',
                        3000
                    );
                }
            }
            
            if (state.allItems.length === 0) {
                elements.errorMessage.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 12px; align-items: center;">
                        <div style="font-size: 2em;">⚠️</div>
                        <div><strong>No feeds could be loaded</strong></div>
                        <div style="font-size: 0.9em; color: #999; margin-top: 8px;">
                            This could be due to:<br>
                            • Network connectivity issues<br>
                            • API rate limiting<br>
                            • Some feeds being temporarily unavailable
                        </div>
                        <div style="font-size: 0.85em; color: #777; margin-top: 12px;">
                            💡 <strong>Tip:</strong> Check your internet connection and try again. Cached articles may still be available.
                        </div>
                    </div>
                `;
                setErrorVisible(true);
                setRetryVisible(true);
                elements.retryButton.focus();
            } else {
                syncSelectedSourcesWithData();
                savePreferences();
                if (elements.sourceFilters) elements.sourceFilters.dataset.built = '';
                initializeSourceFilters();
                scheduleRender();
            }
        }

        // ============================================================
        // Rendering — persistent DOM nodes (vanilla React.memo equivalent)
        //
        // Old code recreated 300+ <div class="feed-item"> nodes from scratch
        // every time the user toggled a checkbox. That's tens of thousands
        // of DOM allocations per filter change → guaranteed jank.
        //
        // The new strategy:
        //   1. Build each card's DOM ONCE, cached in `state._cardNodes`.
        //   2. On subsequent filter changes, walk the filteredItems array
        //      and just toggle a `.is-hidden` class + reorder via
        //      appendChild (which MOVES rather than copies the node).
        //   3. Hover/click handlers are attached at the container via
        //      event delegation — no per-card listener storms.
        // ============================================================

        // One-time event delegation for card action buttons. Hooked up once
        // (idempotent) on the feed container so individual cards don't carry
        // their own onclick handlers.
        function ensureCardEventDelegation() {
            if (!elements.feedContainer) return;
            if (elements.feedContainer.dataset.delegated === '1') return;
            elements.feedContainer.dataset.delegated = '1';
            elements.feedContainer.addEventListener('click', (e) => {
                if (e.target.closest('.action-btn')) return;
                if (e.target.closest('a.article-card__title-link, a.article-card__link')) return;
                const card = e.target.closest('.article-card');
                if (card) openArticleFromCard(card);
            });
            elements.feedContainer.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                if (isTypingContext(e.target)) return;
                const card = e.target.closest('.article-card');
                if (!card || !card.contains(e.target)) return;
                if (e.target.closest('a, button, input, select, textarea, [role="button"]')) return;
                e.preventDefault();
                openArticleFromCard(card);
            });
            elements.feedContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.action-btn');
                if (!btn) return;
                e.preventDefault();
                e.stopPropagation();
                const card = btn.closest('.feed-item');
                if (!card) return;
                const key = card.dataset.key;
                const item = state.allItems.find(it => it._key === key);
                if (!item) return;
                if (btn.dataset.action === 'copy') {
                    copyToClipboard(item.link, 'Article link copied to clipboard!');
                    const orig = btn.textContent;
                    btn.textContent = '✓';
                    btn.classList.add('action-btn--ok');
                    setTimeout(() => {
                        btn.textContent = orig;
                        btn.classList.remove('action-btn--ok');
                    }, 1000);
                } else if (btn.dataset.action === 'share') {
                    shareArticle(item);
                }
            });
        }

        const useListLayout = !!document.querySelector('.stay-updated-dashboard[data-app="stay-updated"]');

        function updateArticleCardContent(node, item) {
            if (!node?.classList.contains('article-card')) return;
            const severity = item._severity || detectThreatSeverity(item.title, item.description);
            item._severity = severity;

            let badge = node.querySelector('.threat-badge');
            const head = node.querySelector('.article-card__head') || node.querySelector('.article-card__body');
            if (severity) {
                if (!badge && head) {
                    badge = document.createElement('span');
                    badge.className = `threat-badge threat-badge--${severity}`;
                    const titleEl = head.querySelector('.article-card__title');
                    if (titleEl) head.insertBefore(badge, titleEl);
                    else head.prepend(badge);
                }
                if (badge) {
                    badge.className = `threat-badge threat-badge--${severity}`;
                    badge.textContent = getThreatBadgeLabel(severity);
                }
            } else if (badge) {
                badge.remove();
            }

            const titleEl = node.querySelector('.article-card__title');
            const excerptEl = node.querySelector('.article-card__excerpt');
            if (titleEl) setHighlightedText(titleEl, sanitizeHtml(item.title || 'Untitled'), state.searchQuery);
            if (excerptEl) {
                const desc = sanitizeHtml(item.description || '').trim() || 'No description available.';
                setHighlightedText(excerptEl, desc, state.searchQuery);
            }
        }

        function buildCardNode(item) {
            const feedItem = document.createElement('article');
            feedItem.className = 'feed-item';
            feedItem.dataset.source = item.sourceName || 'Unknown';
            feedItem.dataset.key = item._key;

            try {
                const dateTime = item.pubDate instanceof Date
                    ? item.pubDate.getTime()
                    : new Date(item.pubDate).getTime();
                feedItem.dataset.date = isNaN(dateTime) ? Date.now() : dateTime;
            } catch {
                feedItem.dataset.date = Date.now();
            }

            const sourceName = item.sourceName || 'Unknown';
            const categoryKey = getSourceCategory(sourceName);
            feedItem.dataset.category = categoryKey;
            const safeTitle = sanitizeHtml(item.title || 'Untitled');
            if (!item._severity) item._severity = detectThreatSeverity(item.title, item.description);

            if (useListLayout) {
                feedItem.classList.add('article-card');
                feedItem.setAttribute('role', 'article');
                feedItem.setAttribute('aria-selected', 'false');
                feedItem.tabIndex = 0;

                const shell = document.createElement('div');
                shell.className = 'article-card__shell';

                const media = document.createElement('div');
                media.className = 'article-card__media';
                media.dataset.source = sourceName;
                const thumbUrl = resolveCardThumbnailUrl(item);
                if (thumbUrl) {
                    setArticleCardMediaImage(media, thumbUrl, sourceName);
                } else {
                    replaceMediaWithPlaceholder(media, sourceName);
                }

                const body = document.createElement('div');
                body.className = 'article-card__body';

                const head = document.createElement('div');
                head.className = 'article-card__head';

                const categoryPill = document.createElement('span');
                categoryPill.className = `article-card__category article-card__category--${categoryKey}`;
                categoryPill.textContent = getCategoryShortLabel(categoryKey);
                head.appendChild(categoryPill);

                if (item._severity) {
                    const badge = document.createElement('span');
                    badge.className = `threat-badge threat-badge--${item._severity}`;
                    badge.textContent = getThreatBadgeLabel(item._severity);
                    head.appendChild(badge);
                }

                if (isArticleNew(item.pubDate)) {
                    const newBadge = document.createElement('span');
                    newBadge.className = 'article-card__new-badge';
                    newBadge.textContent = 'NEW';
                    head.appendChild(newBadge);
                }

                const h2 = document.createElement('h2');
                h2.className = 'article-card__title';
                const titleLink = document.createElement('a');
                titleLink.className = 'article-card__title-link';
                try {
                    titleLink.href = new URL(item.link).href;
                } catch {
                    titleLink.href = '#';
                    titleLink.dataset.invalid = '1';
                }
                titleLink.target = '_blank';
                titleLink.rel = 'noopener noreferrer';
                titleLink.setAttribute('aria-label', `Read article: ${safeTitle} from ${sourceName}`);
                setHighlightedText(titleLink, safeTitle, state.searchQuery);
                h2.appendChild(titleLink);
                head.appendChild(h2);

                const desc = document.createElement('p');
                desc.className = 'article-card__excerpt';
                const descPlain = sanitizeHtml(item.description || '').trim() || 'No description available.';
                setHighlightedText(desc, descPlain, state.searchQuery);

                const footer = document.createElement('footer');
                footer.className = 'article-card__footer';

                const timeEl = document.createElement('span');
                timeEl.className = 'article-card__footer-time';
                timeEl.textContent = getRelativeTime(item.pubDate);
                footer.appendChild(timeEl);

                const readTime = estimateReadingTime(
                    `${item.title || ''} ${item.description || ''}`
                );
                if (readTime) {
                    footer.appendChild(document.createTextNode(' • '));
                    const readEl = document.createElement('span');
                    readEl.className = 'article-card__footer-read';
                    readEl.textContent = readTime;
                    footer.appendChild(readEl);
                }

                footer.appendChild(document.createTextNode(' • '));
                const sourceEl = document.createElement('span');
                sourceEl.className = 'article-card__footer-source';
                const favicon = document.createElement('img');
                favicon.className = 'article-card__favicon';
                favicon.src = buildFaviconSrc(sourceName);
                favicon.alt = '';
                favicon.width = 16;
                favicon.height = 16;
                favicon.loading = 'lazy';
                favicon.decoding = 'async';
                sourceEl.append(favicon, document.createTextNode(` ${sourceName}`));
                footer.appendChild(sourceEl);

                body.append(head, desc, footer);
                shell.append(media, body);
                feedItem.appendChild(shell);
                if (!thumbUrl) observeCardMedia(media, item);
                return feedItem;
            }

            // Status dot — outside the link so clicks on it don't navigate.
            const status = document.createElement('div');
            status.className = 'feed-status';
            if (state.feedStatus[sourceName] === 'error') {
                status.classList.add('error');
                status.title = 'Source failed to load';
                status.setAttribute('aria-label', 'Feed source error');
            } else {
                status.title = 'Source loaded successfully';
                status.setAttribute('aria-label', 'Feed source active');
            }
            feedItem.appendChild(status);

            // Action buttons — no per-card listeners (delegated above).
            const actions = document.createElement('div');
            actions.className = 'article-actions';
            actions.innerHTML =
                '<button class="action-btn" data-action="copy" title="Copy link" aria-label="Copy article link">🔗</button>' +
                '<button class="action-btn" data-action="share" title="Share article" aria-label="Share article">📤</button>';
            feedItem.appendChild(actions);

            const link = document.createElement('a');
            try {
                link.href = new URL(item.link).href;
            } catch {
                link.href = '#';
                link.dataset.invalid = '1';
            }
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.setAttribute('aria-label', `Read article: ${safeTitle} from ${sourceName}`);
            link.title = `Click to read full article on ${sourceName}`;

            // Image / skeleton placeholder. The skeleton is a clean shimmer
            // (see .feed-item__skeleton in stayupdated.scss) — no heavy
            // glowing square, no concurrent backdrop-filter layers.
            const imageUrl = extractImageUrl(item);
            if (imageUrl) {
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = safeTitle || 'Article image';
                img.loading = 'lazy';
                img.decoding = 'async';
                // Fail gracefully: swap to the skeleton if the image breaks.
                img.addEventListener('error', () => {
                    img.remove();
                    const skel = document.createElement('div');
                    skel.className = 'feed-item__skeleton';
                    link.insertBefore(skel, link.firstChild);
                }, { once: true });
                link.appendChild(img);
            } else {
                const skel = document.createElement('div');
                skel.className = 'feed-item__skeleton';
                skel.setAttribute('aria-hidden', 'true');
                link.appendChild(skel);
            }

            const h2 = document.createElement('h2');
            h2.textContent = safeTitle;
            link.appendChild(h2);

            const meta = document.createElement('div');
            meta.className = 'pub-date';
            const readingTime = estimateReadingTime(item.description || '');
            meta.innerHTML =
                `<span class="pub-date__time">${getRelativeTime(item.pubDate)}</span>` +
                (readingTime ? `<span class="pub-date__sep" aria-hidden="true">•</span><span class="reading-time">${readingTime}</span>` : '');
            link.appendChild(meta);

            const desc = document.createElement('p');
            const descText = sanitizeHtml(item.description || 'No description available.');
            desc.textContent = descText;
            link.appendChild(desc);

            const source = document.createElement('div');
            source.className = 'source';
            source.textContent = sourceName;
            link.appendChild(source);

            feedItem.appendChild(link);
            return feedItem;
        }

        function buildEmptyStateNode() {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.setAttribute('role', 'status');
            emptyState.setAttribute('aria-live', 'polite');
            const hasItems = state.allItems.length > 0;
            const hasFilters = state.searchQuery || state.dateFilter !== 'all' || state.selectedSources.size > 0;
            const tipsList = hasFilters
                ? ['Try different keywords or remove some search terms',
                   'Select more sources from the sidebar (or click All)',
                   hasItems ? 'Try date range “All time” — articles may be outside the last 3 days' : 'Adjust the date range to include more articles',
                   'Clear all filters to see everything']
                : ['Use the quick filter buttons above to focus on topics',
                   'Search for keywords like "vulnerability" or "CVE"',
                   'Select specific sources from the sidebar filters',
                   'Articles are loading in the background — check back soon'];
            const tipsHtml = tipsList.map(t => `<li>${t}</li>`).join('');
            emptyState.innerHTML = `
                <p class="empty-state__lead">${hasFilters ? 'No articles found' : 'No articles available'}</p>
                <p class="empty-state__hint">${
                    hasFilters
                        ? 'Try adjusting your date range or sources, or clear filters to see more.'
                        : (hasItems
                            ? `${state.allItems.length} articles are loaded but hidden by your current filters.`
                            : 'Articles will appear here once feeds finish loading.')
                }</p>
                ${hasFilters ? '<button type="button" class="su-btn su-btn--action" id="emptyStateClear" style="margin-top:1rem">Clear filters</button>' : ''}
                <div class="empty-state-help">
                    <div class="empty-state-help-title">💡 ${hasFilters ? 'Tips to find more articles:' : 'Getting Started:'}</div>
                    <ul class="empty-state-help-text">${tipsHtml}</ul>
                </div>
            `;
            const clearBtn = emptyState.querySelector('#emptyStateClear');
            if (clearBtn) clearBtn.addEventListener('click', () => elements.clearFiltersBtn.click());
            return emptyState;
        }

        function getVisibleCardKeys() {
            const filtered = state.filteredItems;
            const fastSlice = state._fastBoot && !state._lazyArchiveReady;
            if (!fastSlice) {
                return new Set(filtered.map((it) => it._key));
            }
            return new Set(
                filtered.slice(0, CONFIG.MAX_INITIAL_PAINT).map((it) => it._key)
            );
        }

        function scheduleLazyArchiveBuild() {
            if (state._lazyArchiveReady || state._lazyArchivePending) return;
            if (!state.allItems.length || !elements.feedContainer) return;
            state._lazyArchivePending = true;

            const buildGen = state._lazyGeneration;
            const runChunk = (startIndex) => {
                if (buildGen !== state._lazyGeneration) {
                    state._lazyBuildHandle = null;
                    state._lazyArchivePending = false;
                    return;
                }
                const container = elements.feedContainer;
                const filteredKeys = new Set(state.filteredItems.map((it) => it._key));
                const visibleKeys = getVisibleCardKeys();
                const end = Math.min(startIndex + CONFIG.LAZY_CARD_BATCH, state.allItems.length);
                const fragment = document.createDocumentFragment();

                for (let i = startIndex; i < end; i++) {
                    const item = state.allItems[i];
                    if (!item?._key) continue;
                    let node = state._cardNodes.get(item._key);
                    if (!node) {
                        node = buildCardNode(item);
                        state._cardNodes.set(item._key, node);
                    }
                    if (!filteredKeys.has(item._key) || !visibleKeys.has(item._key)) {
                        node.classList.add('is-hidden');
                    } else {
                        node.classList.remove('is-hidden');
                    }
                    if (!node.parentNode) {
                        fragment.appendChild(node);
                    }
                }
                if (fragment.childNodes.length) {
                    container.appendChild(fragment);
                }

                if (end < state.allItems.length) {
                    state._lazyBuildHandle = rIC(() => runChunk(end));
                } else {
                    state._lazyArchiveReady = true;
                    state._fastBoot = false;
                    state._lazyBuildHandle = null;
                    state._lazyArchivePending = false;
                    scheduleRender();
                }
            };

            /* Defer until after first paint frame, then idle-chunk the archive */
            const scheduleIdle = () => {
                state._lazyBuildHandle = rIC(() => runChunk(0));
            };
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(scheduleIdle);
            } else {
                scheduleIdle();
            }
        }

        function renderFeeds() {
            resolveDashboardElements();
            if (!elements.feedContainer) {
                updateStats();
                return;
            }
            ensureCardEventDelegation();

            const container = elements.feedContainer;
            clearFeedSkeleton();

            try {
                if (state.filteredItems.length === 0) {
                    container.innerHTML = '';
                    container.appendChild(buildEmptyStateNode());
                    syncKeyboardFocusAfterRender();
                    if (!state._lazyArchiveReady) scheduleLazyArchiveBuild();
                    return;
                }

                const visibleKeys = getVisibleCardKeys();
                const fragment = document.createDocumentFragment();
                const stale = container.querySelector('.empty-state');
                if (stale) stale.remove();

                const presentNodes = state._cardNodes;
                const fastSlice = state._fastBoot && !state._lazyArchiveReady;
                const paintLimit = fastSlice
                    ? Math.min(CONFIG.MAX_INITIAL_PAINT, state.filteredItems.length)
                    : state.filteredItems.length;

                for (let i = 0; i < paintLimit; i++) {
                    const item = state.filteredItems[i];

                    let node = presentNodes.get(item._key);
                    if (!node) {
                        node = buildCardNode(item);
                        presentNodes.set(item._key, node);
                    } else if (node.classList.contains('article-card')) {
                        updateArticleCardContent(node, item);
                        const mediaEl = node.querySelector('.article-card__media');
                        if (mediaEl && mediaEl.dataset.hasImage !== '1') {
                            observeCardMedia(mediaEl, item);
                        }
                    }
                    node.classList.remove('is-hidden');
                    if (i < 24 && !node.dataset.animated) {
                        node.style.animationDelay = `${i * 0.025}s`;
                        node.dataset.animated = '1';
                    } else if (i >= 24) {
                        node.style.animationDelay = '0s';
                    }
                    fragment.appendChild(node);
                }

                presentNodes.forEach((node, key) => {
                    if (!visibleKeys.has(key) && node.parentNode === container) {
                        node.classList.add('is-hidden');
                    }
                });

                container.appendChild(fragment);
                syncKeyboardFocusAfterRender();

                if (!state._lazyArchiveReady) {
                    scheduleLazyArchiveBuild();
                }
            } catch (err) {
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.error('[StayUpdated] renderFeeds failed:', err);
                }
            } finally {
                updateStats();
                syncCardSelectionAfterRender();
            }
        }

        // Date filtering utilities
        function getDateRange(filterType) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            switch (filterType) {
                case '3days': {
                    const threeDaysAgo = new Date(today);
                    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                    return { from: threeDaysAgo, to: now };
                }
                case 'today':
                    return { from: today, to: now };
                case 'week':
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return { from: weekAgo, to: now };
                case 'month':
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return { from: monthAgo, to: now };
                case 'custom':
                    return {
                        from: state.dateFrom ? new Date(state.dateFrom) : null,
                        to: state.dateTo ? new Date(state.dateTo + 'T23:59:59') : null
                    };
                default:
                    return { from: null, to: null };
            }
        }

        function isDateInRange(itemDate, dateRange) {
            if (!dateRange.from && !dateRange.to) return true;

            try {
                const item = new Date(itemDate);
                if (Number.isNaN(item.getTime())) return false;

                // RSS feeds sometimes publish slightly in the future; treat as "now"
                // so the default 3-day window does not hide fresh articles.
                const now = new Date();
                const effective = item > now ? now : item;

                if (dateRange.from && effective < dateRange.from) return false;
                if (dateRange.to && effective > dateRange.to) return false;

                return true;
            } catch {
                return false;
            }
        }

        /** Keep sidebar selection aligned with loaded articles (fixes stale localStorage). */
        function syncSelectedSourcesWithData() {
            const available = new Set(
                state.allItems.map((it) => it.sourceName).filter(Boolean)
            );
            if (available.size === 0) return;

            if (state.selectedSources.size > 0) {
                const next = new Set();
                state.selectedSources.forEach((name) => {
                    if (available.has(name)) next.add(name);
                });
                state.selectedSources = next.size > 0 ? next : available;
            } else {
                state.selectedSources = new Set(available);
            }
        }

        // ============================================================
        // Filtering & sorting — memoized.
        //
        // Vanilla equivalent of:
        //   const filteredItems = useMemo(
        //     () => filterAndSort(allItems, deps),
        //     [allItems, search, sources, dateFilter, sortBy]
        //   );
        //
        // We build a cheap dependency key. If it matches the cached key, we
        // reuse the previous filteredItems array reference and skip straight
        // to the render step. That's what makes toggling a single checkbox
        // feel instant — the bulk of the cost (string compares, date math,
        // sort) is paid once per *unique* filter combination.
        // ============================================================
        function buildFilterKey() {
            // Sources serialised once (sorted for deterministic key).
            const srcKey = state.selectedSources.size
                ? Array.from(state.selectedSources).sort().join('\u0001')
                : '*';
            return [
                state._datasetVersion,
                state.searchQuery.trim().toLowerCase(),
                state.sortBy,
                state.dateFilter,
                state.dateFrom || '',
                state.dateTo || '',
                srcKey
            ].join('\u0002');
        }

        function applyFilters() {
            if (!Array.isArray(state.allItems)) state.allItems = [];

            const cacheKey = buildFilterKey();
            if (state._filterCache.key === cacheKey && state._filterCache.items) {
                // Memo hit — nothing changed, just re-render against existing DOM.
                state.filteredItems = state._filterCache.items;
                renderFeeds();
                return;
            }

            // Pre-compute date range ONCE per call (was previously recomputed per item).
            const dateRange = (state.dateFilter && state.dateFilter !== 'all')
                ? getDateRange(state.dateFilter)
                : null;
            const query = state.searchQuery ? state.searchQuery.toLowerCase().trim() : '';
            const sources = state.selectedSources;
            const sourceFilterActive = sources && sources.size > 0;

            // Single pass: combine all filters into one .filter() rather than chaining
            // three separate passes (which previously allocated 3 intermediate arrays).
            const filtered = [];
            for (let i = 0, n = state.allItems.length; i < n; i++) {
                const item = state.allItems[i];
                if (!item || !item.title) continue;
                if (dateRange && !isDateInRange(item.pubDate, dateRange)) continue;
                if (query && (!item._searchText || item._searchText.indexOf(query) === -1)) continue;
                if (sourceFilterActive && !sources.has(item.sourceName)) continue;
                filtered.push(item);
            }

            // Sort in-place (avoids a second array allocation from .sort() on a copy).
            const sortBy = state.sortBy;
            filtered.sort((a, b) => {
                if (sortBy === 'date-desc') return b.pubDate - a.pubDate;
                if (sortBy === 'date-asc') return a.pubDate - b.pubDate;
                if (sortBy === 'source') return a.sourceName.localeCompare(b.sourceName);
                return 0;
            });

            state.filteredItems = filtered;
            state._filterCache = { key: cacheKey, items: filtered };
            renderFeeds();
        }

        // PERF: replaced a setInterval-based number tween that fired 20 times
        // over 300ms PER STAT, PER FILTER CHANGE. With rapid typing in the
        // search box that produced dozens of overlapping intervals — the
        // single worst offender for filter-time jank. We now just write the
        // numbers directly; the CSS handles the subtle "pop" via a 120ms
        // colour/scale transition on `.stat-value` when its content changes.
        function updateStats() {
            resolveDashboardElements();
            const allLen = state.allItems.length;
            const showLen = state.filteredItems.length;

            // Cache the unique-source count on dataset version so we don't
            // re-Set() 300+ items every render.
            if (state._sourceCountVersion !== state._datasetVersion) {
                const set = new Set();
                for (let i = 0; i < allLen; i++) set.add(state.allItems[i].sourceName);
                state._uniqueSourceCount = set.size;
                state._sourceCountVersion = state._datasetVersion;
            }

            const totalEl = elements.totalCount;
            const showEl = elements.showingCount;
            const srcEl = elements.sourceCount;
            if (totalEl) totalEl.textContent = String(allLen);
            if (showEl) showEl.textContent = String(showLen);
            if (srcEl) srcEl.textContent = String(state._uniqueSourceCount);

            if (elements.feedContainer) {
                elements.feedContainer.setAttribute(
                    'aria-label',
                    `Showing ${showLen} of ${allLen} articles`
                );
            }
        }

        /** Reload snapshot first; optional background live merge (header Refresh). */
        async function refreshDashboardFeeds(options = {}) {
            const backgroundLive = options.backgroundLive === true;
            resolveDashboardElements();
            setErrorVisible(false);
            setRetryVisible(false);
            setFeedSkeletonVisible(true);
            state._filterCache.key = null;

            const snap = await loadStaticSnapshot({ bypassCache: true });
            if (snap) {
                setFeedSkeletonVisible(false);
                finishDashboardBoot();
                updateFeedStatusLine(snap, false);
            }

            if (!backgroundLive) {
                if (!snap) {
                    setFeedSkeletonVisible(false);
                    return fetchAllFeeds({ hardRefresh: true }).then(finishDashboardBoot);
                }
                return;
            }

            if (!snap) {
                setFeedSkeletonVisible(false);
                return fetchAllFeeds({ hardRefresh: false }).then(finishDashboardBoot).catch(() => {});
            }

            return fetchAllFeeds({ hardRefresh: false, background: true })
                .then(finishDashboardBoot)
                .catch(() => {});
        }

        // Source categories mapping
        const sourceCategories = {
            'government': {
                name: '🏛️ Government & Critical Infrastructure',
                shortName: 'Government',
                icon: '🏛️',
                keywords: ['CISA', 'CERT', 'NIST', 'NCSC', 'US-CERT', 'Government']
            },
            'news': {
                name: '🕵️ Investigative Journalism & Breaking News',
                shortName: 'News',
                icon: '🕵️',
                keywords: ['Krebs', 'Hacker News', 'Dark Reading', 'BleepingComputer', 'Schneier', 'Risky Business', 'Graham Cluley', 'SecurityWeek', 'Help Net Security', 'Security Affairs', 'Cyber Security News', 'HackRead']
            },
            'research': {
                name: '🔬 Threat Research & Malware Analysis',
                shortName: 'Research',
                icon: '🔬',
                keywords: ['Project Zero', 'Talos', 'SANS', 'Mandiant', 'Securelist', 'Sophos Threat', 'Malwarebytes', 'Check Point', 'Unit 42', 'WeLiveSecurity', 'CrowdStrike', 'TAG', 'Trail of Bits', 'Zero Day Initiative']
            },
            'offensive': {
                name: '🛡️ Offensive Security & Hacking Techniques',
                shortName: 'Offensive',
                icon: '🛡️',
                keywords: ['OffSec', 'Offensive Security', 'Bishop Fox', 'Hacking The Cloud', 'Hack The Box', 'KitPloit', 'MalwareTech', 'DFIR', 'InfoSec Writeups', 'Pentest']
            },
            'cloud': {
                name: '☁️ Platform & Cloud Security',
                shortName: 'Cloud',
                icon: '☁️',
                keywords: ['AWS Security', 'Microsoft Security', 'MSRC', 'Cloud']
            },
            'tools': {
                name: '🔧 Security Operations & Tools',
                shortName: 'SecOps',
                icon: '🔧',
                keywords: ['Sophos Security Ops', 'Naked Security', 'Security Operations']
            },
            'community': {
                name: '👥 Community & Forums',
                shortName: 'Community',
                icon: '👥',
                keywords: ['reddit', 'r/netsec', 'r/blueteamsec', 'Hacker News', 'Community']
            },
            'bugbounty': {
                name: '🎯 Bug Bounty & Responsible Disclosure',
                shortName: 'Bug Bounty',
                icon: '🎯',
                keywords: ['Bug Bounty', 'Intigriti', 'YesWeHack', 'HackerOne', 'Bug Bounty Writeups']
            },
            'other': {
                name: '📰 Other Sources',
                shortName: 'Other',
                icon: '📰',
                keywords: []
            }
        };

        function getSourceCategory(sourceName) {
            const configured = rssFeeds.find((f) => f.name === sourceName);
            if (configured?.category && sourceCategories[configured.category]) {
                return configured.category;
            }
            const nameLower = sourceName.toLowerCase();
            for (const [key, category] of Object.entries(sourceCategories)) {
                if (category.keywords.some(keyword => nameLower.includes(keyword.toLowerCase()))) {
                    return key;
                }
            }
            return 'other';
        }

        // ============================================================
        // Sidebar source filters — rebuilt ONCE, then mutated in place.
        //
        // Old code rebuilt all ~55 checkboxes (and bound 55 fresh `change`
        // listeners) every keystroke in the source-search input and every
        // time the article list grew. That re-paint of the sidebar was
        // visible as a "flash" on every keystroke and added GC pressure.
        //
        // New strategy:
        //   • Build the sidebar DOM exactly once, when feeds finish loading.
        //   • A single delegated `change` listener on `#sourceFilters` handles
        //     all 55 checkboxes (vanilla React.memo equivalent for the row).
        //   • Source-search input filters via a class toggle on each row —
        //     no DOM is recreated.
        //   • Live source-count updates mutate a <span> textContent rather
        //     than rebuilding the row.
        // ============================================================
        const SOURCE_FILTER_BUILD_VERSION = '5';

        const FOLDER_SELECT_ICON = `<svg class="folder-action__icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12.207 4.793a1 1 0 0 1 0 1.414l-5 5a1 1 0 0 1-1.414 0l-2.5-2.5a1 1 0 0 1 1.414-1.414L6.5 9.086l4.293-4.293a1 1 0 0 1 1.414 0z"/></svg>`;

        let _sourceTreeDelegatesBound = false;

        function bindSourceTreeDelegates() {
            if (_sourceTreeDelegatesBound || !elements.sourceFilters) return;
            _sourceTreeDelegatesBound = true;
            elements.sourceFilters.classList.add('source-tree');
            elements.sourceFilters.addEventListener('change', onSidebarChange);
            elements.sourceFilters.addEventListener('click', onSidebarClick);
            elements.sourceFilters.addEventListener('keydown', onSidebarKeydown);
        }

        function initializeSourceFilters() {
            if (!elements.sourceFilters) return;

            if (!rssFeeds.length) {
                elements.sourceFilters.innerHTML =
                    '<p class="source-filters-status" role="status">No feed sources configured. Check <code>_data/stayupdated-feeds.yml</code>.</p>';
                return;
            }

            // If already built, just refresh dynamic bits (counts, statuses).
            if (elements.sourceFilters.dataset.built === '1'
                && elements.sourceFilters.dataset.buildVersion === SOURCE_FILTER_BUILD_VERSION) {
                refreshSourceCountsAndStatus();
                updateSourceFilterCount();
                return;
            }

            const allAvailableSources = rssFeeds.map(feed => feed.name);
            const loadedSources = new Set(state.allItems.map(item => item.sourceName));

            const sourceCounts = {};
            for (let i = 0; i < state.allItems.length; i++) {
                const n = state.allItems[i].sourceName;
                sourceCounts[n] = (sourceCounts[n] || 0) + 1;
            }

            const categorizedSources = {};
            allAvailableSources.forEach(source => {
                const cat = getSourceCategory(source);
                (categorizedSources[cat] = categorizedSources[cat] || []).push(source);
            });

            elements.sourceFilters.innerHTML = '';

            Object.entries(categorizedSources).forEach(([categoryKey, sources]) => {
                const category = sourceCategories[categoryKey] || { name: '📰 Other Sources', icon: '📰' };

                const details = document.createElement('details');
                details.className = 'source-category';
                details.dataset.category = categoryKey;

                const isExpanded = !state.expandedCategories.size || state.expandedCategories.has(categoryKey);
                details.open = isExpanded;
                if (isExpanded) state.expandedCategories.add(categoryKey);

                const folderLabel = category.shortName
                    || category.name.replace(category.icon, '').trim();
                const safeFolderLabel = escapeHtml(folderLabel);
                const safeIcon = escapeHtml(category.icon);

                const summary = document.createElement('summary');
                summary.className = 'source-folder-summary';
                summary.innerHTML = `
                    <span class="folder-title-group">
                        <span class="folder-chevron${isExpanded ? '' : ' is-collapsed'}" aria-hidden="true"></span>
                        <span class="folder-icon" aria-hidden="true">${safeIcon}</span>
                        <span class="folder-name">${safeFolderLabel}</span>
                        <span class="folder-badge">${sources.length}</span>
                    </span>
                    <span class="folder-actions">
                        <span class="folder-action"
                              data-action="select-all-cat"
                              role="button"
                              tabindex="0"
                              title="Select all in ${safeFolderLabel}"
                              aria-label="Select all sources in ${safeFolderLabel}">${FOLDER_SELECT_ICON}</span>
                    </span>
                `;

                const content = document.createElement('div');
                content.className = 'source-folder-content';

                sources.sort().forEach(source => {
                    const isLoaded = loadedSources.has(source);
                    content.appendChild(createSourceFilterItem(source, isLoaded, sourceCounts[source] || 0));
                });

                details.append(summary, content);
                details.addEventListener('toggle', () => {
                    const chevron = summary.querySelector('.folder-chevron');
                    if (details.open) {
                        state.expandedCategories.add(categoryKey);
                        chevron?.classList.remove('is-collapsed');
                    } else {
                        state.expandedCategories.delete(categoryKey);
                        chevron?.classList.add('is-collapsed');
                    }
                    savePreferences();
                });
                elements.sourceFilters.appendChild(details);
            });

            bindSourceTreeDelegates();

            elements.sourceFilters.dataset.built = '1';
            elements.sourceFilters.dataset.buildVersion = SOURCE_FILTER_BUILD_VERSION;
            updateSourceFilterCount();
        }

        // Cheap update path: re-uses the already-built DOM, just patches
        // counts and status dots. Called every time a batch of feeds finishes
        // loading.
        function refreshSourceCountsAndStatus() {
            if (!elements.sourceFilters) return;
            const loadedSources = new Set(state.allItems.map(item => item.sourceName));
            const sourceCounts = {};
            for (let i = 0; i < state.allItems.length; i++) {
                const n = state.allItems[i].sourceName;
                sourceCounts[n] = (sourceCounts[n] || 0) + 1;
            }
            const items = elements.sourceFilters.querySelectorAll('.source-filter-item');
            items.forEach(item => {
                const source = item.dataset.source;
                const isLoaded = loadedSources.has(source);
                const isError = state.feedStatus[source] === 'error';
                item.classList.toggle('disabled', !isLoaded && !isError);
                const countEl = item.querySelector('.source-count');
                if (countEl) countEl.textContent = isLoaded ? (sourceCounts[source] || 0) : (isError ? '!' : '…');
                const statusEl = item.querySelector('.source-status');
                if (statusEl) {
                    statusEl.classList.toggle('loading', !isLoaded && !isError);
                    statusEl.classList.toggle('error', isError);
                }
                const cb = item.querySelector('input[type="checkbox"]');
                if (cb) cb.disabled = !isLoaded;
            });
        }

        function onSidebarChange(e) {
            const cb = e.target;
            if (cb.tagName !== 'INPUT' || cb.type !== 'checkbox') return;
            const source = cb.value;
            const row = cb.closest('.source-filter-item');
            if (cb.checked) {
                state.selectedSources.add(source);
                row && row.classList.add('checked');
            } else {
                state.selectedSources.delete(source);
                row && row.classList.remove('checked');
            }
            savePreferences();
            updateSourceFilterCount();
            scheduleRender();
        }

        function onSidebarKeydown(e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const action = e.target.closest('.folder-action[data-action]');
            if (action) {
                e.preventDefault();
                action.click();
            }
        }

        function onSidebarClick(e) {
            // Per-category select-all (icon control)
            const selBtn = e.target.closest('[data-action="select-all-cat"]');
            if (selBtn) {
                e.preventDefault();
                e.stopPropagation();
                const catDiv = selBtn.closest('.source-category');
                const checkboxes = catDiv.querySelectorAll('input[type="checkbox"]:not(:disabled)');
                checkboxes.forEach(c => {
                    if (!c.checked) {
                        c.checked = true;
                        state.selectedSources.add(c.value);
                        c.closest('.source-filter-item').classList.add('checked');
                    }
                });
                savePreferences();
                updateSourceFilterCount();
                scheduleRender();
            }
        }

        function createSourceFilterItem(source, isLoaded, count) {
            const item = document.createElement('div');
            item.className = 'source-filter-item form-check';
            item.dataset.source = source;
            if (!isLoaded) item.classList.add('disabled');

            const safeId = `source-${source.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')}`;

            const safeSource = escapeHtml(source);
            item.innerHTML = `
                <span class="source-status${!isLoaded ? ' loading' : ''}" aria-hidden="true"></span>
                <input type="checkbox" class="form-check-input" id="${safeId}" value="${source.replace(/"/g, '&quot;')}"${isLoaded ? '' : ' disabled'}>
                <label class="form-check-label source-filter-item__label" for="${safeId}">${safeSource}</label>
                <span class="source-count">${isLoaded ? count : '…'}</span>
            `;

            // Initial check state (no listener — delegated handler above).
            const cb = item.querySelector('input[type="checkbox"]');
            if (state.selectedSources.size === 0) {
                if (isLoaded) {
                    state.selectedSources.add(source);
                    cb.checked = true;
                }
            } else {
                cb.checked = state.selectedSources.has(source);
            }
            if (cb.checked) item.classList.add('checked');

            return item;
        }

        function updateSourceFilterCount() {
            const selectedCount = state.selectedSources.size;
            const totalCount = rssFeeds.length;
            const badge = elements.sourceFilterCount;
            if (!badge) return;

            if (selectedCount === 0) {
                badge.textContent = 'None selected';
                badge.title = 'No sources selected. Click "All" to select all sources.';
                badge.style.opacity = '0.6';
            } else if (selectedCount === totalCount) {
                badge.textContent = 'All selected';
                badge.title = 'All sources are selected. Click "None" to deselect all.';
                badge.style.opacity = '1';
            } else {
                badge.textContent = `${selectedCount} of ${totalCount}`;
                badge.title = `${selectedCount} out of ${totalCount} sources are selected.`;
                badge.style.opacity = '1';
            }
        }

        function wireDashboardControlListeners() {
        // Debounce search for better performance with visual feedback
        let searchTimeout = null;
        let lastSearchQuery = '';
        
        if (elements.searchInput) elements.searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            state.searchQuery = query;
            
            // Clear previous timeout
            clearTimeout(searchTimeout);
            
            // Show loading indicator for search
            if (query.length > 0) {
                elements.feedContainer.setAttribute('aria-busy', 'true');
                // Show subtle loading indicator
                if (query.length !== lastSearchQuery.length) {
                    // User is actively typing
                }
            } else {
                elements.feedContainer.setAttribute('aria-busy', 'false');
            }
            
            // Debounced search → coalesced render via rAF.
            searchTimeout = setTimeout(() => {
                savePreferences();
                scheduleRender();
                elements.feedContainer.setAttribute('aria-busy', 'false');
                lastSearchQuery = query;
            }, 180); // 180ms feels much snappier than 300ms and the memoised
                     // filter is fast enough to keep up at this cadence.
        });

        if (elements.searchInput) elements.searchInput.addEventListener('focus', () => {
            elements.searchInput.classList.remove('is-hotkey-focus');
        });

        if (elements.searchInput) elements.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (elements.searchInput.value) {
                    elements.searchInput.value = '';
                    state.searchQuery = '';
                    clearTimeout(searchTimeout);
                    savePreferences();
                    scheduleRender();
                }
                blurMainSearch();
            }
        });

        const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
        if (sidebarToggleBtn) {
            sidebarToggleBtn.addEventListener('click', toggleSourcesSidebar);
        }

        const sidebarPanelCloseBtn = document.getElementById('sidebarPanelCloseBtn');
        if (sidebarPanelCloseBtn) {
            sidebarPanelCloseBtn.addEventListener('click', () => {
                if (!state.sidebarCollapsed) toggleSourcesSidebar();
            });
        }

        const sidebarBackdrop = document.getElementById('sidebarBackdrop');
        if (sidebarBackdrop) {
            sidebarBackdrop.addEventListener('click', () => {
                if (!state.sidebarCollapsed) {
                    state.sidebarCollapsed = true;
                    applySidebarUi();
                    savePreferences();
                }
            });
        }

        if (typeof SU_MOBILE_MQ.addEventListener === 'function') {
            SU_MOBILE_MQ.addEventListener('change', () => {
                if (isMobileLayout()) {
                    state.sidebarCollapsed = true;
                }
                applySidebarUi();
            });
        } else if (typeof SU_MOBILE_MQ.addListener === 'function') {
            SU_MOBILE_MQ.addListener(() => {
                if (isMobileLayout()) {
                    state.sidebarCollapsed = true;
                }
                applySidebarUi();
            });
        }

        if (elements.sortSelect) {
            elements.sortSelect.addEventListener('change', (e) => {
                state.sortBy = e.target.value;
                savePreferences();
                scheduleRender();
            });
        }

        if (elements.dateFilter) {
            elements.dateFilter.addEventListener('change', (e) => {
                state.dateFilter = e.target.value;
                if (state.dateFilter === 'all') {
                    state._fastBoot = false;
                    invalidateFilterCache();
                }
                if (state.dateFilter === 'custom') {
                    if (elements.customDateRange) elements.customDateRange.hidden = false;
                } else {
                    if (elements.customDateRange) elements.customDateRange.hidden = true;
                    state.dateFrom = null;
                    state.dateTo = null;
                }
                savePreferences();
                scheduleRender();
            });
        }

        const today = new Date().toISOString().split('T')[0];
        if (elements.dateFrom) elements.dateFrom.setAttribute('max', today);
        if (elements.dateTo) elements.dateTo.setAttribute('max', today);

        if (elements.dateFrom) elements.dateFrom.addEventListener('change', (e) => {
            const selectedDate = e.target.value;
            
            // Validate date is not in the future
            if (selectedDate > today) {
                showNotification('Date cannot be in the future', 'warning', 2500);
                e.target.value = today;
                state.dateFrom = today;
            } else {
                state.dateFrom = selectedDate;
            }
            
            // Auto-adjust end date if it's before start date
            if (state.dateFrom && state.dateTo && state.dateFrom > state.dateTo) {
                elements.dateTo.value = state.dateFrom;
                state.dateTo = state.dateFrom;
                showNotification('End date adjusted to match start date', 'info', 2000);
            }
            
            // Validate date range is not too large (optional - can be removed)
            if (state.dateFrom && state.dateTo) {
                const fromDate = new Date(state.dateFrom);
                const toDate = new Date(state.dateTo);
                const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
                if (daysDiff > 365) {
                    showNotification('Date range is very large. Results may take longer to load.', 'warning', 3000);
                }
            }
            
            savePreferences();
            scheduleRender();
        });

        if (elements.dateTo) elements.dateTo.addEventListener('change', (e) => {
            const selectedDate = e.target.value;
            
            // Validate date is not in the future
            if (selectedDate > today) {
                showNotification('Date cannot be in the future', 'warning', 2500);
                e.target.value = today;
                state.dateTo = today;
            } else {
                state.dateTo = selectedDate;
            }
            
            // Auto-adjust start date if it's after end date
            if (state.dateFrom && state.dateTo && state.dateFrom > state.dateTo) {
                elements.dateFrom.value = state.dateTo;
                state.dateFrom = state.dateTo;
                showNotification('Start date adjusted to match end date', 'info', 2000);
            }
            
            // Validate date range
            if (state.dateFrom && state.dateTo) {
                const fromDate = new Date(state.dateFrom);
                const toDate = new Date(state.dateTo);
                const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
                if (daysDiff > 365) {
                    showNotification('Date range is very large. Results may take longer to load.', 'warning', 3000);
                }
            }

            savePreferences();
            scheduleRender();
        });

        // PERF: source-search no longer rebuilds the sidebar. We just toggle a
        // `.is-hidden` class on each row. ~55 className writes vs. recreating
        // 55 DOM nodes + 55 listeners on every keystroke.
        let sourceSearchRaf = null;
        if (elements.sourceSearch) elements.sourceSearch.addEventListener('input', (e) => {
            const q = e.target.value.trim().toLowerCase();
            if (sourceSearchRaf) cancelAnimationFrame(sourceSearchRaf);
            sourceSearchRaf = requestAnimationFrame(() => {
                sourceSearchRaf = null;
                const rows = elements.sourceFilters.querySelectorAll('.source-filter-item');
                let visibleCount = 0;
                rows.forEach(row => {
                    const match = !q || row.dataset.source.toLowerCase().indexOf(q) !== -1;
                    row.classList.toggle('is-hidden', !match);
                    if (match) visibleCount++;
                });
                // Hide entirely-empty categories so the sidebar stays clean.
                elements.sourceFilters.querySelectorAll('.source-category').forEach(cat => {
                    const visible = cat.querySelectorAll('.source-filter-item:not(.is-hidden)').length;
                    cat.classList.toggle('is-hidden', visible === 0);
                });
                document.querySelectorAll('.stay-updated-dashboard .filter-presets .post-tag').forEach(btn => btn.classList.remove('is-active'));
                if (visibleCount === 0) {
                    elements.sourceFilters.classList.add('has-no-results');
                } else {
                    elements.sourceFilters.classList.remove('has-no-results');
                }
            });
        });

        bindClickableAction(elements.selectAllSources, () => {
            const checkboxes = elements.sourceFilters.querySelectorAll('input[type="checkbox"]:not(:disabled)');
            checkboxes.forEach(cb => {
                cb.checked = true;
                state.selectedSources.add(cb.value);
                cb.closest('.source-filter-item')?.classList.add('checked');
            });
            savePreferences();
            updateSourceFilterCount();
            scheduleRender();
        });

        bindClickableAction(elements.deselectAllSources, () => {
            state.selectedSources.clear();
            elements.sourceFilters.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
                cb.closest('.source-filter-item')?.classList.remove('checked');
            });
            savePreferences();
            updateSourceFilterCount();
            scheduleRender();
        });

        if (elements.expandAllCategories) {
            elements.expandAllCategories.addEventListener('click', () => {
                elements.sourceFilters.querySelectorAll('details.source-category').forEach((details) => {
                    details.open = true;
                    const cat = details.dataset.category;
                    if (cat) state.expandedCategories.add(cat);
                    details.querySelector('.folder-chevron')?.classList.remove('is-collapsed');
                });
                savePreferences();
            });
        }

        if (elements.collapseAllCategories) {
            elements.collapseAllCategories.addEventListener('click', () => {
                elements.sourceFilters.querySelectorAll('details.source-category').forEach((details) => {
                    details.open = false;
                    const cat = details.dataset.category;
                    if (cat) state.expandedCategories.delete(cat);
                    details.querySelector('.folder-chevron')?.classList.add('is-collapsed');
                });
                savePreferences();
            });
        }

        document.querySelectorAll('.stay-updated-dashboard .filter-presets .post-tag').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;

                document.querySelectorAll('.stay-updated-dashboard .filter-presets .post-tag').forEach(b => b.classList.remove('is-active'));
                btn.classList.add('is-active');
                
                // Deselect all first
                state.selectedSources.clear();
                const allCheckboxes = elements.sourceFilters.querySelectorAll('input[type="checkbox"]');
                allCheckboxes.forEach(cb => {
                    cb.checked = false;
                    cb.closest('.source-filter-item')?.classList.remove('checked');
                });
                
                // Select sources in this category
                const categoryDiv = elements.sourceFilters.querySelector(`[data-category="${preset}"]`);
                let selectedCount = 0;
                if (categoryDiv) {
                    const checkboxes = categoryDiv.querySelectorAll('input[type="checkbox"]:not(:disabled)');
                    checkboxes.forEach(checkbox => {
                        checkbox.checked = true;
                        state.selectedSources.add(checkbox.value);
                        checkbox.closest('.source-filter-item')?.classList.add('checked');
                        selectedCount++;
                    });
                    
                    if (categoryDiv && !categoryDiv.open) {
                        categoryDiv.open = true;
                        state.expandedCategories.add(preset);
                        categoryDiv.querySelector('.folder-chevron')?.classList.remove('is-collapsed');
                    }
                }
                
                savePreferences();
                updateSourceFilterCount();
                scheduleRender();
                collapseSidebarIfMobile();

                const presetNames = {
                    government: 'Government',
                    news: 'News',
                    research: 'Research',
                    offensive: 'Offensive Security',
                    bugbounty: 'Bug Bounty',
                    cloud: 'Cloud Security',
                    community: 'Community'
                };
                
                showNotification(
                    `Filtered to ${selectedCount} ${presetNames[preset] || preset} source${selectedCount !== 1 ? 's' : ''}`,
                    'success',
                    2500
                );
            });
        });

        if (elements.retryButton) {
            elements.retryButton.addEventListener('click', () => {
                fetchAllFeeds({ hardRefresh: true }).then(finishDashboardBoot).catch(() => {});
            });
        }

        // ============================================================
        // Welcome banner — dismissal persisted to localStorage.
        // Hardened against:
        //   • localStorage being unavailable (private browsing / disabled).
        //   • The hidden state being applied AFTER the banner has painted
        //     (caused a brief flash). We now read storage synchronously
        //     before the first frame.
        // ============================================================
        (function setupWelcomeBanner() {
            const banner = document.getElementById('welcomeBanner');
            const closeBtn = document.getElementById('closeWelcomeBanner');
            if (!banner) return;

            let dismissed = false;
            try { dismissed = localStorage.getItem('welcomeBannerDismissed') === 'true'; } catch {}
            if (dismissed) banner.classList.add('hidden');

            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    banner.classList.add('hidden');
                    try { localStorage.setItem('welcomeBannerDismissed', 'true'); } catch {}
                });
            }
        })();

        // Header refresh button with better UX
        const headerRefreshBtn = document.getElementById('headerRefreshBtn');
        if (headerRefreshBtn) {
            headerRefreshBtn.addEventListener('click', () => {
                if (headerRefreshBtn.disabled) return;

                headerRefreshBtn.classList.add('loading');
                headerRefreshBtn.disabled = true;
                headerRefreshBtn.setAttribute('aria-busy', 'true');

                refreshDashboardFeeds({ backgroundLive: true }).finally(() => {
                    setTimeout(() => {
                        headerRefreshBtn.classList.remove('loading');
                        headerRefreshBtn.disabled = false;
                        headerRefreshBtn.setAttribute('aria-busy', 'false');
                    }, 500);
                });
            });
        }

        if (elements.toggleButton) {
            elements.toggleButton.addEventListener('click', () => {
                const isAtBottom = (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100;
                if (isAtBottom) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    if (elements.arrowIcon) elements.arrowIcon.textContent = '↑';
                } else {
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    if (elements.arrowIcon) elements.arrowIcon.textContent = '↓';
                }
            });
        }

        function toggleAutoRefresh(e) {
            const enabled = typeof e?.target?.checked === 'boolean'
                ? e.target.checked
                : !state.autoRefreshEnabled;
            state.autoRefreshEnabled = enabled;
            if (elements.autoRefreshToggle) {
                elements.autoRefreshToggle.checked = enabled;
            }
            savePreferences();

            if (state.autoRefreshEnabled) {
                startAutoRefresh();
                showNotification(
                    `Auto-refresh enabled. Feeds will update every ${state.refreshIntervalMinutes} minutes.`,
                    'success',
                    3000
                );
            } else {
                stopAutoRefresh();
                showNotification('Auto-refresh disabled.', 'info', 2000);
            }
        }

        if (elements.autoRefreshToggle) {
            elements.autoRefreshToggle.addEventListener('change', toggleAutoRefresh);
        }

        if (elements.refreshIntervalSelect) {
            elements.refreshIntervalSelect.addEventListener('change', (e) => {
                const mins = Number(e.target.value);
                if (!Number.isFinite(mins) || mins < 5) return;
                state.refreshIntervalMinutes = mins;
                savePreferences();
                if (state.autoRefreshEnabled) {
                    startAutoRefresh();
                }
            });
        }

        // ============================================================
        // Auto-refresh — hardened.
        //
        // Bug fixes vs. previous version:
        //   1. startAutoRefresh() now *always* calls stopAutoRefresh() first
        //      and only ever leaves ONE active interval — protects against
        //      double-toggling, page-visibility races, and the situation
        //      where the toggle is clicked while a fetch is in-flight.
        //   2. lastFeedRefresh is *not* deleted on stop — the page-visibility
        //      handler needs that timestamp to know if a re-show should
        //      trigger a refresh.
        //   3. Page-unload cleans up the interval to avoid stranded timers
        //      during bfcache restores in some browsers.
        // ============================================================
        function startAutoRefresh() {
            stopAutoRefresh();
            state.refreshTimer = setInterval(() => {
                // Don't bother refreshing if the tab is in the background —
                // the visibilitychange listener will catch up when we return.
                if (document.hidden) return;
                fetchAllFeeds();
            }, getRefreshIntervalMs());

            const minutes = state.refreshIntervalMinutes;
            if (elements.refreshInterval) elements.refreshInterval.textContent = `${minutes} min`;
            if (elements.refreshIntervalSelect) elements.refreshIntervalSelect.value = String(minutes);
            if (elements.autoRefreshToggle) elements.autoRefreshToggle.checked = true;
            try { localStorage.setItem('lastFeedRefresh', String(Date.now())); } catch {}
        }

        function stopAutoRefresh() {
            if (state.refreshTimer) {
                clearInterval(state.refreshTimer);
                state.refreshTimer = null;
            }
            if (elements.refreshInterval) elements.refreshInterval.textContent = 'Off';
            if (elements.refreshIntervalSelect && !state.autoRefreshEnabled) {
                elements.refreshIntervalSelect.disabled = false;
            }
            if (elements.autoRefreshToggle && !state.autoRefreshEnabled) {
                elements.autoRefreshToggle.checked = false;
            }
            // NB: deliberately *not* removing lastFeedRefresh — used by the
            // visibilitychange handler to decide if a stale tab should refresh.
        }

        // ============================================================
        // Memory-safety: tear down the interval on every code path that
        // can take this document out of the user's foreground attention.
        //   • pagehide   → BFCache + tab close + cross-doc navigation
        //                  (the only reliable unload event on iOS/Safari).
        //   • beforeunload → covers some legacy unload paths that pagehide
        //                    doesn't fire on synchronously.
        //   • visibility hidden ≥ 5 min → idle background tabs are torn
        //                                 down to free the timer slot.
        // Each listener routes through the same idempotent stopAutoRefresh().
        // We DON'T pass { once: true } because some browsers fire pagehide
        // multiple times during navigation (e.g. bfcache restore + push).
        // stopAutoRefresh is idempotent so that's safe.
        // ============================================================
        const teardown = () => {
            try { stopAutoRefresh(); } catch {}
        };
        window.addEventListener('pagehide', teardown);
        window.addEventListener('beforeunload', teardown);

        // Idle-tab pruning: if the tab has been hidden for 5+ minutes,
        // proactively clear the interval. The visibilitychange handler
        // below will re-arm it when the tab returns to foreground.
        let _hiddenSince = 0;
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                _hiddenSince = Date.now();
            } else if (_hiddenSince &&
                       (Date.now() - _hiddenSince) > 5 * 60 * 1000 &&
                       state.refreshTimer) {
                // Tab was hidden long enough that the timer is just burning
                // memory — restart it cleanly on return.
                stopAutoRefresh();
                if (state.autoRefreshEnabled) startAutoRefresh();
                _hiddenSince = 0;
            }
        });

        // Export functionality with better feedback
        if (elements.exportBtn) elements.exportBtn.addEventListener('click', () => {
            if (state.filteredItems.length === 0) {
                showNotification('No articles to export. Try adjusting your filters.', 'warning', 3000);
                return;
            }
            
            // Show loading state
            const originalText = elements.exportBtn.innerHTML;
            elements.exportBtn.innerHTML = '⏳ Exporting...';
            elements.exportBtn.disabled = true;
            
            try {
                const exportData = {
                    metadata: {
                        exportedAt: new Date().toISOString(),
                        totalArticles: state.filteredItems.length,
                        filters: {
                            searchQuery: state.searchQuery,
                            dateFilter: state.dateFilter,
                            selectedSources: Array.from(state.selectedSources),
                            sortBy: state.sortBy
                        }
                    },
                    articles: state.filteredItems.map(item => ({
                        title: item.title,
                        source: item.sourceName,
                        date: item.pubDate.toISOString(),
                        link: item.link,
                        description: sanitizeHtml(item.description || '')
                    }))
                };
                
                const dataStr = JSON.stringify(exportData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `threat-intel-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                URL.revokeObjectURL(url);
                
                showNotification(`Successfully exported ${state.filteredItems.length} articles!`, 'success', 3000);
            } catch (error) {
                // Only log errors in development
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.error('Export error:', error);
                }
                showNotification('Failed to export articles. Please try again.', 'error', 3000);
            } finally {
                setTimeout(() => {
                    elements.exportBtn.innerHTML = originalText;
                    elements.exportBtn.disabled = false;
                }, 500);
            }
        });

        // Clear filters with confirmation for better UX
        if (elements.clearFiltersBtn) elements.clearFiltersBtn.addEventListener('click', () => {
            const hasActiveFilters = state.searchQuery ||
                                   state.dateFilter !== '3days' ||
                                   state.selectedSources.size < rssFeeds.length;
            
            if (!hasActiveFilters) {
                showNotification('No active filters to clear', 'info', 2000);
                return;
            }
            
            // Smooth transition
            elements.feedContainer.style.opacity = '0.7';
            elements.feedContainer.style.transition = 'opacity 0.2s ease';
            
            setTimeout(() => {
                state.searchQuery = '';
                state.dateFilter = '3days';
                state.dateFrom = null;
                state.dateTo = null;
                state.selectedSources.clear();
                
                elements.searchInput.value = '';
                elements.dateFilter.value = '3days';
                elements.dateFrom.value = '';
                elements.dateTo.value = '';
                elements.customDateRange.hidden = true;
                
                // Reset all rows' checked state in the persistent sidebar.
                elements.sourceFilters.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.checked = false;
                    cb.closest('.source-filter-item')?.classList.remove('checked');
                });
                document.querySelectorAll('.stay-updated-dashboard .filter-presets .post-tag').forEach(b => b.classList.remove('is-active'));

                savePreferences();
                updateSourceFilterCount();
                scheduleRender();

                elements.feedContainer.style.opacity = '1';
                showNotification('All filters cleared', 'success', 2000);
            }, 200);
        });

        // Help modal with comprehensive tips
        if (elements.helpBtn) elements.helpBtn.addEventListener('click', () => {
            const helpModal = document.createElement('div');
            helpModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                overflow-y: auto;
                padding: 20px;
            `;
            helpModal.innerHTML = `
                <div style="
                    background: var(--card-background);
                    padding: 30px;
                    border-radius: 12px;
                    max-width: 600px;
                    width: 100%;
                    border: 1px solid var(--border-color);
                    box-shadow: var(--shadow);
                    max-height: 90vh;
                    overflow-y: auto;
                ">
                    <h2 style="margin-top: 0; color: var(--highlight-color); display: flex; align-items: center; gap: 10px;">
                        <span>💡</span>
                        <span>Help & Tips</span>
                    </h2>
                    
                    <div style="margin: 25px 0;">
                        <h3 style="color: var(--text-color-bright); font-size: 1.1em; margin-bottom: 12px;">⌨️ Keyboard Shortcuts</h3>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                                <span style="display: flex; gap: 6px;"><kbd>/</kbd> or <kbd>F</kbd></span>
                                <span style="color: var(--text-color);">Focus search box</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                                <span><kbd>Ctrl</kbd> + <kbd>R</kbd></span>
                                <span style="color: var(--text-color);">Refresh all feeds</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                                <span><kbd>Esc</kbd></span>
                                <span style="color: var(--text-color);">Close dialogs</span>
                            </div>
                        </div>
                    </div>

                    <div style="margin: 25px 0;">
                        <h3 style="color: var(--text-color-bright); font-size: 1.1em; margin-bottom: 12px;">🔍 Search Tips</h3>
                        <ul style="color: var(--text-color); line-height: 1.8; padding-left: 20px; margin: 0;">
                            <li>Search by article title, description, or source name</li>
                            <li>Try keywords like "ransomware", "vulnerability", "CVE"</li>
                            <li>Search is case-insensitive</li>
                            <li>Combine with date filters for better results</li>
                        </ul>
                    </div>

                    <div style="margin: 25px 0;">
                        <h3 style="color: var(--text-color-bright); font-size: 1.1em; margin-bottom: 12px;">🎯 Quick Filters</h3>
                        <ul style="color: var(--text-color); line-height: 1.8; padding-left: 20px; margin: 0;">
                            <li>Use preset buttons to quickly filter by category</li>
                            <li>Click multiple presets to combine categories</li>
                            <li>Select specific sources from the sidebar</li>
                            <li>Use date filters to find recent articles</li>
                        </ul>
                    </div>

                    <div style="margin: 25px 0;">
                        <h3 style="color: var(--text-color-bright); font-size: 1.1em; margin-bottom: 12px;">⚡ Features</h3>
                        <ul style="color: var(--text-color); line-height: 1.8; padding-left: 20px; margin: 0;">
                            <li><strong>Auto-refresh:</strong> Automatically update feeds every 30 minutes</li>
                            <li><strong>Export:</strong> Download filtered articles as JSON</li>
                            <li><strong>Share:</strong> Click article actions to copy links</li>
                            <li><strong>Cache:</strong> Cached articles load instantly</li>
                        </ul>
                    </div>

                    <button type="button" class="button su-help-modal__close" style="width: 100%; margin-top: 20px;">
                        Got it! Close
                    </button>
                </div>
            `;
            document.body.appendChild(helpModal);
            const closeHelp = () => helpModal.remove();
            helpModal.querySelector('.su-help-modal__close')?.addEventListener('click', closeHelp);
            helpModal.addEventListener('click', (e) => {
                if (e.target === helpModal) closeHelp();
            });
        });

        // Enhanced keyboard shortcuts with better UX
        document.addEventListener('keydown', (e) => {
            if (!dashboardRoot()) return;

            const key = e.key;
            const typing = isTypingContext(e.target);
            const inMainSearch = e.target === elements.searchInput;

            if (typing) {
                if (key === 'Escape') {
                    if (inMainSearch) {
                        e.preventDefault();
                        if (elements.searchInput.value) {
                            elements.searchInput.value = '';
                            state.searchQuery = '';
                            savePreferences();
                            scheduleRender();
                        }
                        blurMainSearch();
                    } else {
                        e.target.blur();
                    }
                    return;
                }
                if (inMainSearch && (e.ctrlKey || e.metaKey) && key === 'k') {
                    e.preventDefault();
                    elements.searchInput.value = '';
                    state.searchQuery = '';
                    savePreferences();
                    scheduleRender();
                }
                return;
            }

            if (key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                focusMainSearch(true);
                return;
            }

            if (key === 'Escape') {
                document.querySelectorAll('div[style*="z-index: 10000"]').forEach((m) => m.remove());
                clearKeyboardCardFocus();
                state._keyboardIndex = -1;
                blurMainSearch();
                return;
            }

            if (key === 'j' || key === 'J' || key === 'ArrowDown') {
                e.preventDefault();
                moveKeyboardCardFocus(1);
                return;
            }
            if (key === 'k' || key === 'K' || key === 'ArrowUp') {
                e.preventDefault();
                moveKeyboardCardFocus(-1);
                return;
            }
            if (key === 'Enter' && state._keyboardIndex >= 0) {
                e.preventDefault();
                openKeyboardFocusedCard();
                return;
            }

            if (key === 'f' || ((e.ctrlKey || e.metaKey) && key === 'k')) {
                e.preventDefault();
                focusMainSearch(true);
            } else if (key === 'r' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (headerRefreshBtn && !headerRefreshBtn.disabled) {
                    headerRefreshBtn.click();
                } else {
                    fetchAllFeeds();
                }
            } else if (key === '?' || ((e.ctrlKey || e.metaKey) && key === '/')) {
                e.preventDefault();
                elements.helpBtn?.click();
            } else if (key === 'i' || key === 'I') {
                e.preventDefault();
                toggleSourcesSidebar();
            }
        });

        } // wireDashboardControlListeners

        // Initialization lifecycle.
        //
        // Designed to run safely inside ANY host page — including the
        // Chirpy theme, which loads its own JS bundle that finishes
        // mounting AFTER `defer` scripts execute but BEFORE the `load`
        // event. The wrapper below guarantees:
        //
        //   1. We never touch the DOM if our target hook `#feed-container`
        //      isn't present on the current page (so dropping the script
        //      into Chirpy's global asset list is a no-op on unrelated
        //      pages — zero leak risk).
        //   2. We work at every readyState ('loading' | 'interactive' |
        //      'complete') without race conditions.
        //   3. We are *idempotent* — a duplicated <script> tag or a
        //      hot-reload won't double-bind handlers or re-fetch feeds.
        //   4. Initial render is flushed via the page's own rAF-scheduled
        //      pipeline (`scheduleRender`), so cached articles paint on
        //      the same frame the script becomes ready — no manual
        //      refresh required.
        // ============================================================
        function initDashboard() {
            resolveDashboardElements();

            if (elements.dateFilter) {
                elements.dateFilter.value = state.dateFilter;
                if (state.dateFilter === 'custom' && elements.customDateRange) {
                    elements.customDateRange.hidden = false;
                    if (state.dateFrom && elements.dateFrom) elements.dateFrom.value = state.dateFrom;
                    if (state.dateTo && elements.dateTo) elements.dateTo.value = state.dateTo;
                } else if (elements.customDateRange) {
                    elements.customDateRange.hidden = true;
                }
            }
            if (elements.searchInput) {
                elements.searchInput.value = state.searchQuery || '';
            }
            if (elements.refreshIntervalSelect) {
                elements.refreshIntervalSelect.value = String(state.refreshIntervalMinutes || 30);
            }
            if (elements.autoRefreshToggle) {
                elements.autoRefreshToggle.checked = state.autoRefreshEnabled === true;
            }

            syncSelectedSourcesWithData();
            if (state.selectedSources.size > 0) savePreferences();

            state._fastBoot = state.dateFilter === '3days' && !state._lazyArchiveReady;
            if (elements.sourceFilters) {
                elements.sourceFilters.dataset.built = '';
            }
            initializeSourceFilters();
            if (ensureSnapshotDateFilter()) {
                state._fastBoot = false;
            }
            scheduleRender();
            if (state.autoRefreshEnabled) startAutoRefresh();

            /* Background archive ingest after first filtered paint */
            if (!state._lazyArchiveReady && state.allItems.length > CONFIG.MAX_INITIAL_PAINT) {
                requestAnimationFrame(() => {
                    if (!state._lazyArchiveReady) scheduleLazyArchiveBuild();
                });
            }
        }

        const finishDashboardBoot = initDashboard;

        async function bootStayUpdated() {
            const resolved = resolveDashboardElements();
            if (!resolved) return;
            wireDashboardListenersOnce();

            const root = elements.feedContainer;

            setLoadingVisible(true);
            setFeedSkeletonVisible(true);
            setErrorVisible(false);
            setRetryVisible(false);

            // Paint source tree from YAML immediately (do not wait for fetch).
            _sourceTreeDelegatesBound = false;
            if (elements.sourceFilters) {
                elements.sourceFilters.dataset.built = '';
            }
            initializeSourceFilters();

            if (!rssFeeds.length) {
                setLoadingVisible(false);
                setFeedSkeletonVisible(false);
                setLoadingVisible(false);
                if (elements.errorMessage) {
                    elements.errorMessage.innerHTML = '<p><strong>Feed configuration missing.</strong> Check <code>_data/stayupdated-feeds.yml</code>.</p>';
                    setErrorVisible(true);
                }
                return;
            }

            /* Hydrate analyst workspace from localStorage before any paint */
            try { loadPreferences(); } catch {}

            const finishBootWithLiveFallback = () => {
                if (restoreSnapshot()) {
                    finishDashboardBoot();
                    setLoadingVisible(false);
                    fetchAllFeeds({ hardRefresh: false, background: true })
                        .then(finishDashboardBoot)
                        .catch(() => {});
                    return;
                }
                fetchAllFeeds({ hardRefresh: false })
                    .then(finishDashboardBoot)
                    .catch(handleBootError);
            };

            function handleBootError(error) {
                if (window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1') {
                    console.error('[StayUpdated] Initialization error:', error);
                }
                setLoadingVisible(false);
                setFeedSkeletonVisible(false);
                if (elements.errorMessage) {
                    const snapHint = getSnapshotUrl()
                        ? '<p style="font-size:0.85em;margin:0.5rem 0 0;color:var(--text-muted-color)">Ensure <code>assets/data/feeds-snapshot.json</code> is deployed (run the feed-sync GitHub Action or commit the snapshot).</p>'
                        : '';
                    elements.errorMessage.innerHTML = `
                        <p><strong>Could not load feeds.</strong></p>
                        <p style="color:var(--text-muted-color);font-size:0.9em;margin:0">
                          ${(error && error.message) || 'Check your connection and try again.'}
                        </p>
                        ${snapHint}
                    `;
                    setErrorVisible(true);
                    setRetryVisible(true);
                }
                root.dataset.stayUpdatedBound = '';
            }

            // Idempotency guard. If a previous boot already wired this
            // root, exit early. Survives livereload, Turbo/Pjax-style
            // navigation, and accidental duplicate <script> tags.
            if (root.dataset.stayUpdatedBound === '1') {
                if (state.allItems.length > 0) {
                    resolveDashboardElements();
                    scheduleRender();
                    return;
                }
                root.dataset.stayUpdatedBound = '';
            }
            root.dataset.stayUpdatedBound = '1';

            if (!state._listenersWired) {
                state._listenersWired = true;
                try {
                    const banner = document.getElementById('welcomeBanner');
                    if (banner && localStorage.getItem('welcomeBannerDismissed') === 'true') {
                        banner.classList.add('hidden');
                    }
                } catch {}
            }

            // --- 1. Static snapshot (GitHub Actions / assets/data) ----------
            const staticSnap = await loadStaticSnapshot();
            if (staticSnap) {
                setLoadingVisible(false);
                setFeedSkeletonVisible(false);
                finishDashboardBoot();
                updateFeedStatusLine(staticSnap, false);
                const stale = isStaticSnapshotStale(staticSnap.generatedAt);
                const isLocal = window.location.hostname === 'localhost'
                    || window.location.hostname === '127.0.0.1';
                if (stale && !isLocal) {
                    fetchAllFeeds({ hardRefresh: false, background: true })
                        .then(finishDashboardBoot)
                        .catch((err) => {
                        });
                }
                return;
            }

            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.warn(
                    '[StayUpdated] Static snapshot missing at',
                    getSnapshotUrl() || '(no data-snapshot-url)',
                    '— falling back to live fetch.'
                );
            }

            finishBootWithLiveFallback();
        }

        // --- 3. Page-visibility refresh hook ----------------------------
        // Wired at module load (not inside bootStayUpdated) so a tab that
        // is hidden during the initial paint still resumes cleanly when
        // brought forward. Cheap, single listener — safe everywhere.
        document.addEventListener('visibilitychange', () => {
            if (document.hidden || !state.autoRefreshEnabled) return;
            const last = parseInt(localStorage.getItem('lastFeedRefresh') || '0', 10);
            if (last && (Date.now() - last) > getRefreshIntervalMs()) {
                fetchAllFeeds({ hardRefresh: false });
            }
        });

        window.addEventListener('pageshow', (event) => {
            if (!document.querySelector('.stay-updated-dashboard[data-app="stay-updated"]')) return;
            resolveDashboardElements();
            const rootPs = elements.feedContainer;
            if (!rootPs) return;
            if (event.persisted || (rootPs.dataset.stayUpdatedBound === '1' && state.allItems.length === 0)) {
                rootPs.dataset.stayUpdatedBound = '';
                restoreSnapshot();
                bootStayUpdated();
            }
        });

        // --- 4. Lifecycle dispatch --------------------------------------
        // Branches on document.readyState so we work correctly whether
        // the script is `defer`red (Chirpy aggregator layout), inline at
        // the bottom of <body> (legacy standalone), or injected by a
        // dynamic loader. `requestAnimationFrame` gives the browser one
        // frame to finish layout calc before we start measuring/painting.
        function dispatchBoot() {
            if (!document.querySelector('.stay-updated-dashboard[data-app="stay-updated"]')) return;
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(bootStayUpdated);
            } else {
                bootStayUpdated();
            }
        }

        function wireDashboardListenersOnce() {
            if (state._listenersWired) return;
            if (!resolveDashboardElements()) return;
            state._listenersWired = true;
            wireDashboardControlListeners();
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                wireDashboardListenersOnce();
                dispatchBoot();
            }, { once: true });
        } else {
            wireDashboardListenersOnce();
            dispatchBoot();
        }

