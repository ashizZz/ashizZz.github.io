// Configuration
        const CONFIG = {
            CACHE_DURATION: 30 * 60 * 1000, // 30 minutes
            AUTO_REFRESH_INTERVAL: 30 * 60 * 1000, // 30 minutes
            MAX_ITEMS_PER_FEED: 10,
            PROXY_URL: "https://api.rss2json.com/v1/api.json?rss_url=",
            FETCH_TIMEOUT: 15000, // 15 seconds per feed
            CONCURRENT_FEEDS: 10, // Load 10 feeds at a time
            USE_CACHE_FIRST: true // Show cached feeds immediately
        };

        const rssFeeds = [
            // 🏛️ Government & Critical Infrastructure
            { url: "https://www.cisa.gov/cybersecurity-advisories/all.xml", name: "CISA Advisories" },
            { url: "https://www.cisa.gov/news.xml", name: "CISA News" },
            { url: "https://www.ncsc.gov.uk/api/1/services/v1/all-rss-feed.xml", name: "NCSC (UK)" },
            { url: "https://www.kb.cert.org/vulfeed/", name: "CERT Vulnerability Notes" },
            { url: "https://www.nist.gov/blogs/cybersecurity-insights/rss.xml", name: "NIST Cybersecurity Insights" },
            { url: "https://www.us-cert.gov/ncas/alerts.xml", name: "US-CERT Alerts" },
            
            // 🕵️ Investigative Journalism & Breaking News
            { url: "https://krebsonsecurity.com/feed/", name: "Krebs on Security" },
            { url: "https://feeds.feedburner.com/TheHackersNews", name: "The Hacker News" },
            { url: "https://www.darkreading.com/rss.xml", name: "Dark Reading" },
            { url: "https://www.bleepingcomputer.com/feed/", name: "BleepingComputer" },
            { url: "https://www.schneier.com/feed/atom/", name: "Schneier on Security" },
            { url: "https://risky.biz/feeds/risky-business", name: "Risky Business" },
            { url: "https://www.grahamcluley.com/feed/", name: "Graham Cluley" },
            { url: "https://www.securityweek.com/rss", name: "SecurityWeek" },
            { url: "https://www.helpnetsecurity.com/feed", name: "Help Net Security" },
            { url: "https://securityaffairs.co/wordpress/feed", name: "Security Affairs" },
            { url: "https://www.cybersecuritynews.com/feed/", name: "Cyber Security News" },
            { url: "https://www.hackread.com/feed", name: "HackRead" },
            
            // 🔬 Threat Research & Malware Analysis
            { url: "https://googleprojectzero.blogspot.com/feeds/posts/default?alt=rss", name: "Google Project Zero" },
            { url: "https://talosintelligence.com/rss", name: "Cisco Talos Intelligence" },
            { url: "https://isc.sans.edu/rssfeed_full.xml", name: "SANS Internet Storm Center" },
            { url: "https://www.mandiant.com/resources/blog/rss.xml", name: "Mandiant" },
            { url: "https://securelist.com/feed/", name: "Securelist (Kaspersky)" },
            { url: "https://news.sophos.com/en-us/category/threat-research/feed/", name: "Sophos Threat Research" },
            { url: "https://www.malwarebytes.com/blog/feed", name: "Malwarebytes Labs" },
            { url: "https://research.checkpoint.com/feed", name: "Check Point Research" },
            { url: "https://unit42.paloaltonetworks.com/feed", name: "Palo Alto Unit 42" },
            { url: "https://www.welivesecurity.com/feed", name: "WeLiveSecurity" },
            { url: "https://www.crowdstrike.com/blog/feed", name: "CrowdStrike Blog" },
            { url: "https://blog.google/threat-analysis-group/rss", name: "Google TAG" },
            { url: "https://blog.trailofbits.com/feed/", name: "Trail of Bits" },
            { url: "https://www.zerodayinitiative.com/blog?format=rss", name: "Zero Day Initiative" },
            
            // 🛡️ Offensive Security & Hacking Techniques
            { url: "https://www.offsec.com/blog/feed", name: "OffSec (Offensive Security)" },
            { url: "https://www.offensive-security.com/blog/feed", name: "Offensive Security" },
            { url: "https://bishopfox.com/feeds/blog.rss", name: "Bishop Fox" },
            { url: "https://hackingthe.cloud/feed_rss_created.xml", name: "Hacking The Cloud" },
            { url: "https://www.hackthebox.com/rss/blog/all", name: "Hack The Box (All)" },
            { url: "https://www.hackthebox.com/rss/blog/blue-teaming", name: "HackTheBox Blue Team" },
            { url: "http://feeds.feedburner.com/PentestTools", name: "KitPloit" },
            { url: "https://malwaretech.com/feed.xml", name: "MalwareTech" },
            { url: "https://aboutdfir.com/feed", name: "About DFIR" },
            { url: "https://infosecwriteups.com/feed", name: "InfoSec Writeups" },
            
            // ☁️ Platform & Cloud Security
            { url: "https://aws.amazon.com/blogs/security/feed/", name: "AWS Security Blog" },
            { url: "https://msrc-blog.microsoft.com/feed", name: "Microsoft Security Response Center" },
            { url: "https://www.microsoft.com/security/blog/feed", name: "Microsoft Security Blog" },
            
            // 🔧 Security Operations & Tools
            { url: "https://news.sophos.com/en-us/category/security-operations/feed/", name: "Sophos Security Ops" },
            { url: "https://nakedsecurity.sophos.com/feed", name: "Naked Security" },
            
            // 👥 Community & Forums
            { url: "https://www.reddit.com/r/netsec/.rss", name: "r/netsec" },
            { url: "https://www.reddit.com/r/blueteamsec/.rss", name: "r/blueteamsec" },
            { url: "https://news.ycombinator.com/rss", name: "Hacker News" },
            
            // 🎯 Bug Bounty & Responsible Disclosure
            { url: "https://medium.com/feed/bugbountywriteup/tagged/bug-bounty", name: "Bug Bounty Writeups (Medium)" },
            { url: "https://medium.com/feed/tag/bug-bounty", name: "Medium Bug Bounty Tag" },
            { url: "https://www.intigriti.com/blog/feed", name: "Intigriti Blog" },
            { url: "https://www.yeswehack.com/rss.xml", name: "YesWeHack" },
            { url: "https://www.hackerone.com/blog/feed", name: "HackerOne Blog" }
        ];

        // State management
        const state = {
            allItems: [],
            filteredItems: [],
            selectedSources: new Set(),
            expandedCategories: new Set(),
            searchQuery: '',
            sortBy: 'date-desc',
            dateFilter: 'all',
            dateFrom: null,
            dateTo: null,
            autoRefreshEnabled: false,
            refreshTimer: null,
            feedStatus: {}
        };

        // DOM elements
        const elements = {
            feedContainer: document.getElementById('feedContainer'),
            lastUpdated: document.getElementById('lastUpdated'),
            loadingMessage: document.getElementById('loadingMessage'),
            errorMessage: document.getElementById('errorMessage'),
            retryButton: document.getElementById('retryButton'),
            toggleButton: document.getElementById('toggleButton'),
            arrowIcon: document.getElementById('arrowIcon'),
            searchInput: document.getElementById('searchInput'),
            sortSelect: document.getElementById('sortSelect'),
            dateFilter: document.getElementById('dateFilter'),
            dateFrom: document.getElementById('dateFrom'),
            dateTo: document.getElementById('dateTo'),
            customDateRange: document.getElementById('customDateRange'),
            sourceFilters: document.getElementById('sourceFilters'),
            sourceSearch: document.getElementById('sourceSearch'),
            sourceFilterCount: document.getElementById('sourceFilterCount'),
            selectAllSources: document.getElementById('selectAllSources'),
            deselectAllSources: document.getElementById('deselectAllSources'),
            expandAllCategories: document.getElementById('expandAllCategories'),
            collapseAllCategories: document.getElementById('collapseAllCategories'),
            exportBtn: document.getElementById('exportBtn'),
            clearFiltersBtn: document.getElementById('clearFiltersBtn'),
            helpBtn: document.getElementById('helpBtn'),
            loadingProgress: document.getElementById('loadingProgress'),
            loadingStatus: document.getElementById('loadingStatus'),
            totalCount: document.getElementById('totalCount'),
            showingCount: document.getElementById('showingCount'),
            sourceCount: document.getElementById('sourceCount'),
            autoRefreshToggle: document.getElementById('autoRefreshToggle'),
            refreshInterval: document.getElementById('refreshInterval')
        };

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
            const wordCount = text.split(/\s+/).length;
            const minutes = Math.ceil(wordCount / wordsPerMinute);
            return minutes <= 1 ? '1 min read' : `${minutes} min read`;
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

        function extractImageUrl(item) {
            try {
                if (item.enclosure && item.enclosure.link) {
                    const url = item.enclosure.link;
                    // Validate URL
                    try {
                        new URL(url);
                        return url;
                    } catch {
                        // Invalid URL
                    }
                }
                if (item.thumbnail) {
                    try {
                        new URL(item.thumbnail);
                        return item.thumbnail;
                    } catch {
                        // Invalid URL
                    }
                }
                
                // Try to extract from description
                const desc = item.description || '';
                const imgMatch = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
                if (imgMatch && imgMatch[1]) {
                    try {
                        new URL(imgMatch[1]);
                        return imgMatch[1];
                    } catch {
                        // Invalid URL
                    }
                }
            } catch (e) {
                // Silently fail
            }
            
            return null;
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

        function loadPreferences() {
            const prefs = loadFromStorage('feedPreferences');
            if (prefs) {
                state.selectedSources = new Set(prefs.selectedSources || []);
                state.sortBy = prefs.sortBy || 'date-desc';
                state.dateFilter = prefs.dateFilter || 'all';
                state.dateFrom = prefs.dateFrom || null;
                state.dateTo = prefs.dateTo || null;
                state.autoRefreshEnabled = prefs.autoRefreshEnabled || false;
                state.expandedCategories = new Set(prefs.expandedCategories || []);
                
                elements.sortSelect.value = state.sortBy;
                elements.dateFilter.value = state.dateFilter;
                if (state.dateFilter === 'custom') {
                    elements.customDateRange.style.display = 'flex';
                    if (state.dateFrom) elements.dateFrom.value = state.dateFrom;
                    if (state.dateTo) elements.dateTo.value = state.dateTo;
                }
                elements.autoRefreshToggle.classList.toggle('active', state.autoRefreshEnabled);
                elements.autoRefreshToggle.setAttribute('aria-checked', state.autoRefreshEnabled);
            }
        }

        function savePreferences() {
            saveToStorage('feedPreferences', {
                selectedSources: Array.from(state.selectedSources),
                sortBy: state.sortBy,
                dateFilter: state.dateFilter,
                dateFrom: state.dateFrom,
                dateTo: state.dateTo,
                autoRefreshEnabled: state.autoRefreshEnabled,
                expandedCategories: Array.from(state.expandedCategories || [])
            });
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

        async function fetchFeed(feedConfig, useCache = true) {
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
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
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
                // Only log errors in development
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
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
                            state.allItems.push({
                                ...item,
                                sourceName: result.source || 'Unknown',
                                sourceUrl: result.url || '',
                                pubDate: (() => {
                                    try {
                                        const date = new Date(item.pubDate);
                                        return isNaN(date.getTime()) ? new Date() : date;
                                    } catch {
                                        return new Date();
                                    }
                                })()
                            });
                        }
                    });
                    
                    // Debounce UI updates to avoid excessive re-renders
                    if (updateUI && state.allItems.length > 0) {
                        clearTimeout(filterUpdateTimer);
                        filterUpdateTimer = setTimeout(() => {
                            applyFilters();
                        }, 100); // Update UI every 100ms max
                    }
                } catch (e) {
                    // Silently handle processing errors
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

        async function fetchAllFeeds() {
            elements.feedContainer.innerHTML = '';
            elements.loadingMessage.style.display = 'flex';
            elements.errorMessage.style.display = 'none';
            elements.retryButton.style.display = 'none';
            
            state.feedStatus = {};
            state.allItems = [];

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
                    if (state.selectedSources.size === 0) {
                        const loadedSources = new Set(state.allItems.map(item => item.sourceName));
                        state.selectedSources = new Set(loadedSources);
                        savePreferences();
                    }
                    initializeSourceFilters();
                    applyFilters();
                    // Keep loading message visible while fetching fresh data
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
                const batchPromises = batch.map(async (feed) => {
                    try {
                        const result = await fetchFeed(feed, false); // Fresh fetch
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
                        // Only log errors in development
                        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
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

            // Final update with better feedback
            elements.loadingMessage.style.display = 'none';
            const updateTime = new Date().toLocaleString();
            elements.lastUpdated.textContent = updateTime;
            elements.lastUpdated.setAttribute('aria-live', 'polite');
            elements.lastUpdated.setAttribute('title', `Last updated at ${updateTime}`);
            localStorage.setItem('lastFeedRefresh', Date.now().toString());
            
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
                elements.errorMessage.style.display = 'block';
                elements.retryButton.style.display = 'block';
                elements.retryButton.focus();
            } else {
                // Final filter initialization
                if (state.selectedSources.size === 0) {
                    const loadedSources = new Set(state.allItems.map(item => item.sourceName));
                    state.selectedSources = new Set(loadedSources);
                    savePreferences();
                }
                initializeSourceFilters();
                applyFilters();
            }
        }

        // Rendering
        function renderFeedItem(item) {
            const feedItem = document.createElement('div');
            feedItem.className = 'feed-item';
            feedItem.setAttribute('data-source', item.sourceName || 'Unknown');
            
            // Safely handle date
            try {
                const dateTime = item.pubDate instanceof Date ? item.pubDate.getTime() : new Date(item.pubDate).getTime();
                if (!isNaN(dateTime)) {
                    feedItem.setAttribute('data-date', dateTime);
                }
            } catch (e) {
                // Invalid date - use current time
                feedItem.setAttribute('data-date', Date.now());
            }

            const link = document.createElement('a');
            
            // Validate and set link
            try {
                const url = new URL(item.link);
                link.href = url.href;
            } catch (e) {
                // Invalid URL - use # as fallback
                link.href = '#';
                link.onclick = (e) => {
                    e.preventDefault();
                    showNotification('Invalid article link', 'error', 2000);
                };
            }
            
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            const safeTitle = sanitizeHtml(item.title || 'Untitled');
            const safeSource = item.sourceName || 'Unknown Source';
            link.setAttribute('aria-label', `Read article: ${safeTitle} from ${safeSource}`);
            link.setAttribute('title', `Click to read full article on ${safeSource}`);

            const imageUrl = extractImageUrl(item);
            if (imageUrl) {
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = safeTitle || 'Article image';
                img.loading = 'lazy';
                img.decoding = 'async';
                img.onerror = function() {
                    this.style.display = 'none';
                    const noImage = document.createElement('div');
                    noImage.className = 'no-image';
                    link.insertBefore(noImage, link.firstChild);
                };
                link.appendChild(img);
            } else {
                const noImage = document.createElement('div');
                noImage.className = 'no-image';
                link.appendChild(noImage);
            }

            const title = document.createElement('h2');
            title.textContent = safeTitle;
            title.setAttribute('aria-label', `Article: ${safeTitle}`);
            link.appendChild(title);

            const pubDate = document.createElement('div');
            pubDate.className = 'pub-date';
            const readingTime = estimateReadingTime(item.description || '');
            pubDate.innerHTML = `
                <span>🕒 ${getRelativeTime(item.pubDate)}</span>
                ${readingTime ? `<span class="reading-time">📖 ${readingTime}</span>` : ''}
            `;
            link.appendChild(pubDate);

            const description = document.createElement('p');
            const descText = sanitizeHtml(item.description || "No description available.");
            description.textContent = descText;
            description.setAttribute('aria-label', `Description: ${descText.substring(0, 100)}${descText.length > 100 ? '...' : ''}`);
            link.appendChild(description);

            const source = document.createElement('div');
            source.className = 'source';
            const safeSourceName = item.sourceName || 'Unknown Source';
            source.textContent = safeSourceName;
            source.setAttribute('aria-label', `Source: ${safeSourceName}`);
            link.appendChild(source);

            const status = document.createElement('div');
            status.className = 'feed-status';
            const sourceName = item.sourceName || 'Unknown';
            if (state.feedStatus[sourceName] === 'error') {
                status.classList.add('error');
                status.setAttribute('title', 'Source failed to load');
                status.setAttribute('aria-label', 'Feed source error');
            } else {
                status.setAttribute('title', 'Source loaded successfully');
                status.setAttribute('aria-label', 'Feed source active');
            }
            feedItem.appendChild(status);

            // Article actions
            const actions = document.createElement('div');
            actions.className = 'article-actions';
            
            const shareBtn = document.createElement('button');
            shareBtn.className = 'action-btn';
            shareBtn.innerHTML = '🔗';
            shareBtn.title = 'Copy link';
            shareBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                copyToClipboard(item.link, 'Article link copied to clipboard!');
                
                // Visual feedback
                shareBtn.innerHTML = '✓';
                shareBtn.style.background = 'var(--success-color)';
                setTimeout(() => {
                    shareBtn.innerHTML = '🔗';
                    shareBtn.style.background = '';
                }, 1000);
            };
            
            const shareBtn2 = document.createElement('button');
            shareBtn2.className = 'action-btn';
            shareBtn2.innerHTML = '📤';
            shareBtn2.title = 'Share article';
            shareBtn2.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                shareArticle(item);
            };
            
            actions.appendChild(shareBtn);
            actions.appendChild(shareBtn2);
            feedItem.appendChild(actions);

            feedItem.appendChild(link);
            return feedItem;
        }

        function renderFeeds() {
            // Smooth transition when updating
            if (elements.feedContainer.children.length > 0) {
                elements.feedContainer.style.opacity = '0.7';
                elements.feedContainer.style.transition = 'opacity 0.2s ease';
            }
            
            setTimeout(() => {
                elements.feedContainer.innerHTML = '';

                if (state.filteredItems.length === 0) {
                const emptyState = document.createElement('div');
                emptyState.className = 'empty-state';
                emptyState.setAttribute('role', 'status');
                emptyState.setAttribute('aria-live', 'polite');
                const hasFilters = state.searchQuery || state.dateFilter !== 'all' || state.selectedSources.size > 0;
                const helpTips = hasFilters ? `
                    <div class="empty-state-help">
                        <div class="empty-state-help-title">💡 Tips to find more articles:</div>
                        <div class="empty-state-help-text">
                            <ul style="margin: 8px 0; padding-left: 20px; text-align: left; display: inline-block;">
                                <li>Try different keywords or remove some search terms</li>
                                <li>Select more sources from the sidebar</li>
                                <li>Adjust the date range to include more articles</li>
                                <li>Check spelling of search terms</li>
                                <li>Clear all filters to see everything</li>
                            </ul>
                        </div>
                    </div>
                ` : `
                    <div class="empty-state-help">
                        <div class="empty-state-help-title">💡 Getting Started:</div>
                        <div class="empty-state-help-text">
                            <ul style="margin: 8px 0; padding-left: 20px; text-align: left; display: inline-block;">
                                <li>Use the quick filter buttons above to focus on specific topics</li>
                                <li>Search for keywords like "vulnerability", "ransomware", or "CVE"</li>
                                <li>Select specific sources from the sidebar filters</li>
                                <li>Use date filters to find recent articles</li>
                                <li>Articles are loading in the background - check back soon!</li>
                            </ul>
                        </div>
                    </div>
                `;
                emptyState.innerHTML = `
                    <div class="empty-state-icon">${hasFilters ? '🔍' : '📰'}</div>
                    <h3>${hasFilters ? 'No articles found' : 'No articles available'}</h3>
                    <p>${hasFilters ? 'Try adjusting your search or filter criteria' : 'Feeds are loading or no articles match your current filters'}</p>
                    ${hasFilters ? '<button class="button" onclick="document.getElementById(\'clearFiltersBtn\').click()" style="margin-top: 20px;" aria-label="Clear all filters">Clear All Filters</button>' : ''}
                    ${helpTips}
                `;
                elements.feedContainer.appendChild(emptyState);
                return;
            }

                state.filteredItems.forEach((item, index) => {
                    const feedItem = renderFeedItem(item);
                    // Stagger animation for better visual flow
                    feedItem.style.animationDelay = `${index * 0.03}s`;
                    elements.feedContainer.appendChild(feedItem);
                });

                // Restore opacity
                elements.feedContainer.style.opacity = '1';
                updateStats();
            }, 100);
        }

        // Date filtering utilities
        function getDateRange(filterType) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            switch (filterType) {
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
                
                // Handle invalid dates
                if (isNaN(item.getTime())) {
                    return false;
                }
                
                if (dateRange.from && item < dateRange.from) return false;
                if (dateRange.to && item > dateRange.to) return false;
                
                return true;
            } catch (e) {
                // Invalid date - exclude from results
                return false;
            }
        }

        // Filtering and sorting
        function applyFilters() {
            if (!Array.isArray(state.allItems)) {
                state.allItems = [];
            }
            let filtered = [...state.allItems];
            const initialCount = filtered.length;

            // Date filter
            if (state.dateFilter !== 'all') {
                const dateRange = getDateRange(state.dateFilter);
                const beforeDateFilter = filtered.length;
                filtered = filtered.filter(item => isDateInRange(item.pubDate, dateRange));
                
                // Provide feedback if date filter removed many items
                if (beforeDateFilter > 0 && filtered.length === 0 && state.dateFilter !== 'all') {
                    // Will be handled by empty state
                }
            }

            // Search filter
            if (state.searchQuery) {
                const query = state.searchQuery.toLowerCase().trim();
                if (query.length > 0) {
                    const beforeSearch = filtered.length;
                    filtered = filtered.filter(item => {
                        if (!item || !item.title) return false;
                        try {
                            const title = sanitizeHtml(item.title || '').toLowerCase();
                            const desc = sanitizeHtml(item.description || '').toLowerCase();
                            const source = (item.sourceName || '').toLowerCase();
                            return title.includes(query) || desc.includes(query) || source.includes(query);
                        } catch (e) {
                            return false;
                        }
                    });
                    
                    // Show helpful message for very specific searches
                    if (filtered.length === 0 && beforeSearch > 0 && query.length > 3) {
                        // Message will be shown in empty state
                    }
                }
            }

            // Source filter
            if (state.selectedSources && state.selectedSources.size > 0) {
                filtered = filtered.filter(item =>
                    item && item.sourceName && state.selectedSources.has(item.sourceName)
                );
            }

            // Sort
            filtered.sort((a, b) => {
                switch (state.sortBy) {
                    case 'date-desc':
                        return b.pubDate - a.pubDate;
                    case 'date-asc':
                        return a.pubDate - b.pubDate;
                    case 'source':
                        return a.sourceName.localeCompare(b.sourceName);
                    default:
                        return 0;
                }
            });

            state.filteredItems = filtered;
            
            // Show helpful message if filters are very restrictive
            if (initialCount > 0 && filtered.length === 0) {
                // Empty state will handle this
            } else if (initialCount > filtered.length && filtered.length > 0) {
                // Filters are active but results found
                const reductionPercent = Math.round((1 - filtered.length / initialCount) * 100);
                if (reductionPercent > 80) {
                    // Very restrictive filters - could show subtle hint
                }
            }
            
            renderFeeds();
        }

        function updateStats() {
            const uniqueSources = new Set(state.allItems.map(item => item.sourceName));
            
            // Animate number changes for better UX
            const animateNumber = (element, newValue, oldValue) => {
                if (oldValue === newValue) {
                    element.textContent = newValue;
                    return;
                }
                
                const duration = 300;
                const steps = 20;
                const increment = (newValue - oldValue) / steps;
                let current = oldValue;
                let step = 0;
                
                const timer = setInterval(() => {
                    step++;
                    current += increment;
                    if (step >= steps) {
                        element.textContent = newValue;
                        clearInterval(timer);
                    } else {
                        element.textContent = Math.round(current);
                    }
                }, duration / steps);
            };
            
            const oldTotal = parseInt(elements.totalCount.textContent) || 0;
            const oldShowing = parseInt(elements.showingCount.textContent) || 0;
            const oldSources = parseInt(elements.sourceCount.textContent) || 0;
            
            animateNumber(elements.totalCount, state.allItems.length, oldTotal);
            animateNumber(elements.showingCount, state.filteredItems.length, oldShowing);
            animateNumber(elements.sourceCount, uniqueSources.size, oldSources);
            
            // Update aria-live for screen readers
            if (state.filteredItems.length !== oldShowing) {
                const change = state.filteredItems.length - oldShowing;
                const message = change > 0 
                    ? `Showing ${state.filteredItems.length} articles` 
                    : `Filtered to ${state.filteredItems.length} articles`;
                elements.feedContainer.setAttribute('aria-label', message);
            }
        }

        // Source categories mapping
        const sourceCategories = {
            'government': {
                name: '🏛️ Government & Critical Infrastructure',
                icon: '🏛️',
                keywords: ['CISA', 'CERT', 'NIST', 'NCSC', 'US-CERT', 'Government']
            },
            'news': {
                name: '🕵️ Investigative Journalism & Breaking News',
                icon: '🕵️',
                keywords: ['Krebs', 'Hacker News', 'Dark Reading', 'BleepingComputer', 'Schneier', 'Risky Business', 'Graham Cluley', 'SecurityWeek', 'Help Net Security', 'Security Affairs', 'Cyber Security News', 'HackRead']
            },
            'research': {
                name: '🔬 Threat Research & Malware Analysis',
                icon: '🔬',
                keywords: ['Project Zero', 'Talos', 'SANS', 'Mandiant', 'Securelist', 'Sophos Threat', 'Malwarebytes', 'Check Point', 'Unit 42', 'WeLiveSecurity', 'CrowdStrike', 'TAG', 'Trail of Bits', 'Zero Day Initiative']
            },
            'offensive': {
                name: '🛡️ Offensive Security & Hacking Techniques',
                icon: '🛡️',
                keywords: ['OffSec', 'Offensive Security', 'Bishop Fox', 'Hacking The Cloud', 'Hack The Box', 'KitPloit', 'MalwareTech', 'DFIR', 'InfoSec Writeups', 'Pentest']
            },
            'cloud': {
                name: '☁️ Platform & Cloud Security',
                icon: '☁️',
                keywords: ['AWS Security', 'Microsoft Security', 'MSRC', 'Cloud']
            },
            'community': {
                name: '👥 Community & Forums',
                icon: '👥',
                keywords: ['reddit', 'r/netsec', 'r/blueteamsec', 'Hacker News', 'Community']
            },
            'bugbounty': {
                name: '🎯 Bug Bounty & Responsible Disclosure',
                icon: '🎯',
                keywords: ['Bug Bounty', 'Intigriti', 'YesWeHack', 'HackerOne', 'Bug Bounty Writeups']
            }
        };

        function getSourceCategory(sourceName) {
            const nameLower = sourceName.toLowerCase();
            for (const [key, category] of Object.entries(sourceCategories)) {
                if (category.keywords.some(keyword => nameLower.includes(keyword.toLowerCase()))) {
                    return key;
                }
            }
            return 'other';
        }

        function initializeSourceFilters() {
            // Get all available sources from rssFeeds
            const allAvailableSources = rssFeeds.map(feed => feed.name);
            
            // Get sources that have items loaded
            const loadedSources = new Set(state.allItems.map(item => item.sourceName));
            
            // Get source counts
            const sourceCounts = {};
            state.allItems.forEach(item => {
                sourceCounts[item.sourceName] = (sourceCounts[item.sourceName] || 0) + 1;
            });
            
            // Filter sources based on search
            const searchQuery = (elements.sourceSearch.value || '').toLowerCase();
            
            // Group sources by category
            const categorizedSources = {};
            allAvailableSources.forEach(source => {
                if (searchQuery && !source.toLowerCase().includes(searchQuery)) {
                    return; // Skip if doesn't match search
                }
                
                const category = getSourceCategory(source);
                if (!categorizedSources[category]) {
                    categorizedSources[category] = [];
                }
                categorizedSources[category].push(source);
            });
            
            elements.sourceFilters.innerHTML = '';
            
            if (Object.keys(categorizedSources).length === 0) {
                const noResults = document.createElement('div');
                noResults.className = 'source-filters-empty';
                noResults.innerHTML = `
                    <div class="source-filters-empty-icon">🔍</div>
                    <h3>No sources found</h3>
                    <p>Try adjusting your search query or clear the search</p>
                `;
                elements.sourceFilters.appendChild(noResults);
                updateSourceFilterCount();
                return;
            }
            
            // Render categories
            Object.entries(categorizedSources).forEach(([categoryKey, sources]) => {
                const category = sourceCategories[categoryKey] || { name: '📰 Other Sources', icon: '📰' };
                
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'source-category';
                categoryDiv.dataset.category = categoryKey;
                
                const header = document.createElement('div');
                header.className = 'category-header';
                // Default to expanded if not in state (first load)
                const isExpanded = (state.expandedCategories && state.expandedCategories.has(categoryKey)) || !state.expandedCategories || state.expandedCategories.size === 0;
                header.dataset.expanded = isExpanded ? 'true' : 'false';
                if (isExpanded && state.expandedCategories && !state.expandedCategories.has(categoryKey)) {
                    state.expandedCategories.add(categoryKey);
                }
                
                const titleDiv = document.createElement('div');
                titleDiv.className = 'category-title';
                titleDiv.innerHTML = `
                    <span class="category-icon">${category.icon}</span>
                    <span>${category.name.replace(category.icon, '').trim()}</span>
                    <span class="category-badge">${sources.length}</span>
                `;
                
                const content = document.createElement('div');
                content.className = 'category-content expanded';
                
                const selectAllBtn = document.createElement('button');
                selectAllBtn.className = 'category-select-all';
                selectAllBtn.textContent = 'Select All';
                selectAllBtn.title = 'Select all sources in this category';
                selectAllBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const checkboxes = content.querySelectorAll('input[type="checkbox"]:not(:disabled)');
                    checkboxes.forEach(checkbox => {
                        checkbox.checked = true;
                        state.selectedSources.add(checkbox.value);
                        checkbox.closest('.source-filter-item')?.classList.add('checked');
                    });
                    savePreferences();
                    applyFilters();
                    updateSourceFilterCount();
                });
                
                const toggle = document.createElement('span');
                toggle.className = 'category-toggle';
                toggle.textContent = isExpanded ? '▼' : '▶';
                if (!isExpanded) {
                    toggle.classList.add('collapsed');
                }
                
                header.appendChild(titleDiv);
                header.appendChild(selectAllBtn);
                header.appendChild(toggle);
                
                // Sort sources
                sources.sort().forEach(source => {
                    const isLoaded = loadedSources.has(source);
                    const item = createSourceFilterItem(source, isLoaded, sourceCounts[source] || 0);
                    content.appendChild(item);
                });
                
                // Toggle functionality
                header.addEventListener('click', (e) => {
                    if (e.target === selectAllBtn || e.target.closest('.category-select-all')) return;
                    const currentlyExpanded = header.dataset.expanded === 'true';
                    const newExpanded = !currentlyExpanded;
                    header.dataset.expanded = newExpanded ? 'true' : 'false';
                    content.classList.toggle('expanded', newExpanded);
                    toggle.textContent = newExpanded ? '▼' : '▶';
                    toggle.classList.toggle('collapsed', !newExpanded);
                    if (newExpanded) {
                        state.expandedCategories.add(categoryKey);
                    } else {
                        state.expandedCategories.delete(categoryKey);
                    }
                    savePreferences();
                });
                
                categoryDiv.appendChild(header);
                categoryDiv.appendChild(content);
                elements.sourceFilters.appendChild(categoryDiv);
            });
            
            updateSourceFilterCount();
        }

        function createSourceFilterItem(source, isLoaded, count) {
            const item = document.createElement('div');
            item.className = 'source-filter-item';
            
            if (!isLoaded) {
                item.classList.add('disabled');
            }
            
            const status = document.createElement('div');
            status.className = 'source-status';
            if (!isLoaded) {
                status.classList.add('loading');
            }
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `source-${source.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')}`;
            checkbox.value = source;
            
            // Initialize: if no sources selected, select all loaded sources
            // Otherwise, use saved preferences
            if (state.selectedSources.size === 0) {
                if (isLoaded) {
                    state.selectedSources.add(source);
                    checkbox.checked = true;
                } else {
                    checkbox.checked = false;
                }
            } else {
                checkbox.checked = state.selectedSources.has(source);
            }
            
            checkbox.disabled = !isLoaded;
            
            if (checkbox.checked) {
                item.classList.add('checked');
            }
            
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    state.selectedSources.add(source);
                    item.classList.add('checked');
                } else {
                    state.selectedSources.delete(source);
                    item.classList.remove('checked');
                }
                savePreferences();
                applyFilters();
                updateSourceFilterCount();
            });
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = source;
            
            const countSpan = document.createElement('span');
            countSpan.className = 'source-count';
            countSpan.textContent = isLoaded ? count : '...';
            
            item.appendChild(status);
            item.appendChild(checkbox);
            item.appendChild(label);
            item.appendChild(countSpan);
            
            return item;
        }

        function updateSourceFilterCount() {
            const selectedCount = state.selectedSources.size;
            const totalCount = rssFeeds.length;
            const badge = elements.sourceFilterCount;
            
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

        // Debounce search for better performance with visual feedback
        let searchTimeout = null;
        let lastSearchQuery = '';
        
        elements.searchInput.addEventListener('input', (e) => {
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
            
            // Debounce search to avoid excessive filtering
            searchTimeout = setTimeout(() => {
                applyFilters();
                elements.feedContainer.setAttribute('aria-busy', 'false');
                lastSearchQuery = query;
                
                // Provide helpful feedback
                if (state.filteredItems.length === 0 && query.length > 0) {
                    // Empty state will handle this
                } else if (state.filteredItems.length > 0 && query.length > 0) {
                    // Subtle feedback that search worked
                    const searchResults = state.filteredItems.length;
                    if (searchResults < 5 && query.length > 3) {
                        // Very few results - could show hint
                    }
                }
            }, 300);
        });
        
        // Clear search button functionality
        elements.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && elements.searchInput.value) {
                elements.searchInput.value = '';
                state.searchQuery = '';
                clearTimeout(searchTimeout);
                applyFilters();
                showNotification('Search cleared', 'info', 1500);
            }
        });

        elements.sortSelect.addEventListener('change', (e) => {
            state.sortBy = e.target.value;
            savePreferences();
            applyFilters();
        });

        elements.dateFilter.addEventListener('change', (e) => {
            state.dateFilter = e.target.value;
            
            // Show/hide custom date range inputs
            if (state.dateFilter === 'custom') {
                elements.customDateRange.style.display = 'flex';
            } else {
                elements.customDateRange.style.display = 'none';
                state.dateFrom = null;
                state.dateTo = null;
            }
            
            savePreferences();
            applyFilters();
        });

        // Set max date to today for date inputs
        const today = new Date().toISOString().split('T')[0];
        elements.dateFrom.setAttribute('max', today);
        elements.dateTo.setAttribute('max', today);

        elements.dateFrom.addEventListener('change', (e) => {
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
            applyFilters();
        });

        elements.dateTo.addEventListener('change', (e) => {
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
            applyFilters();
        });

        elements.sourceSearch.addEventListener('input', (e) => {
            initializeSourceFilters();
            // Clear preset active state when searching
            document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
        });

        elements.selectAllSources.addEventListener('click', () => {
            const checkboxes = elements.sourceFilters.querySelectorAll('input[type="checkbox"]:not(:disabled)');
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
                state.selectedSources.add(checkbox.value);
                checkbox.closest('.source-filter-item')?.classList.add('checked');
            });
            savePreferences();
            applyFilters();
            updateSourceFilterCount();
        });

        elements.deselectAllSources.addEventListener('click', () => {
            state.selectedSources.clear();
            const checkboxes = elements.sourceFilters.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
                checkbox.closest('.source-filter-item')?.classList.remove('checked');
            });
            savePreferences();
            applyFilters();
            updateSourceFilterCount();
        });

        elements.expandAllCategories.addEventListener('click', () => {
            const headers = elements.sourceFilters.querySelectorAll('.category-header');
            headers.forEach(header => {
                if (header.dataset.expanded !== 'true') {
                    header.click();
                }
            });
        });

        elements.collapseAllCategories.addEventListener('click', () => {
            const headers = elements.sourceFilters.querySelectorAll('.category-header');
            headers.forEach(header => {
                if (header.dataset.expanded === 'true') {
                    header.click();
                }
            });
        });

        // Preset buttons with better feedback
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                
                // Remove active from all
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
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
                    
                    // Expand the category
                    const header = categoryDiv.querySelector('.category-header');
                    if (header.dataset.expanded !== 'true') {
                        header.click();
                    }
                }
                
                savePreferences();
                applyFilters();
                updateSourceFilterCount();
                
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

        elements.retryButton.addEventListener('click', fetchAllFeeds);

        // Welcome banner close
        const closeWelcomeBanner = document.getElementById('closeWelcomeBanner');
        const welcomeBanner = document.getElementById('welcomeBanner');
        if (closeWelcomeBanner && welcomeBanner) {
            closeWelcomeBanner.addEventListener('click', () => {
                welcomeBanner.classList.add('hidden');
                localStorage.setItem('welcomeBannerDismissed', 'true');
            });
            
            // Check if banner was previously dismissed
            if (localStorage.getItem('welcomeBannerDismissed') === 'true') {
                welcomeBanner.classList.add('hidden');
            }
        }

        // Header refresh button with better UX
        const headerRefreshBtn = document.getElementById('headerRefreshBtn');
        if (headerRefreshBtn) {
            headerRefreshBtn.addEventListener('click', () => {
                if (headerRefreshBtn.disabled) return; // Prevent double-click
                
                headerRefreshBtn.classList.add('loading');
                headerRefreshBtn.disabled = true;
                const originalHTML = headerRefreshBtn.innerHTML;
                headerRefreshBtn.innerHTML = '<span class="refresh-icon">⏳</span><span>Refreshing...</span>';
                
                // Clear cache to force fresh fetch
                const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('feed_'));
                cacheKeys.forEach(key => localStorage.removeItem(key));
                
                fetchAllFeeds().finally(() => {
                    setTimeout(() => {
                        headerRefreshBtn.classList.remove('loading');
                        headerRefreshBtn.disabled = false;
                        headerRefreshBtn.innerHTML = originalHTML;
                    }, 500);
                });
            });
        }

        elements.toggleButton.addEventListener('click', () => {
            const isAtBottom = (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100;
            if (isAtBottom) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                elements.arrowIcon.textContent = '↑';
            } else {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                elements.arrowIcon.textContent = '↓';
            }
        });

        // Toggle auto-refresh with click and keyboard support
        function toggleAutoRefresh() {
            state.autoRefreshEnabled = !state.autoRefreshEnabled;
            elements.autoRefreshToggle.classList.toggle('active', state.autoRefreshEnabled);
            elements.autoRefreshToggle.setAttribute('aria-checked', state.autoRefreshEnabled);
            savePreferences();
            
            if (state.autoRefreshEnabled) {
                startAutoRefresh();
                showNotification('Auto-refresh enabled. Feeds will update every 30 minutes.', 'success', 3000);
            } else {
                stopAutoRefresh();
                showNotification('Auto-refresh disabled.', 'info', 2000);
            }
        }

        elements.autoRefreshToggle.addEventListener('click', toggleAutoRefresh);
        
        // Keyboard support for toggle switch
        elements.autoRefreshToggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleAutoRefresh();
            }
        });

        // Auto-refresh
        function startAutoRefresh() {
            stopAutoRefresh();
            state.refreshTimer = setInterval(() => {
                fetchAllFeeds();
            }, CONFIG.AUTO_REFRESH_INTERVAL);
            
            const minutes = CONFIG.AUTO_REFRESH_INTERVAL / 60000;
            elements.refreshInterval.textContent = `${minutes} min`;
            elements.autoRefreshToggle.setAttribute('aria-checked', 'true');
            localStorage.setItem('lastFeedRefresh', Date.now().toString());
        }

        function stopAutoRefresh() {
            if (state.refreshTimer) {
                clearInterval(state.refreshTimer);
                state.refreshTimer = null;
            }
            elements.refreshInterval.textContent = 'Off';
            elements.autoRefreshToggle.setAttribute('aria-checked', 'false');
            localStorage.removeItem('lastFeedRefresh');
        }

        // Export functionality with better feedback
        elements.exportBtn.addEventListener('click', () => {
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
        elements.clearFiltersBtn.addEventListener('click', () => {
            const hasActiveFilters = state.searchQuery || 
                                   state.dateFilter !== 'all' || 
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
                state.dateFilter = 'all';
                state.dateFrom = null;
                state.dateTo = null;
                state.selectedSources.clear();
                
                elements.searchInput.value = '';
                elements.dateFilter.value = 'all';
                elements.dateFrom.value = '';
                elements.dateTo.value = '';
                elements.customDateRange.style.display = 'none';
                
                initializeSourceFilters();
                savePreferences();
                applyFilters();
                
                elements.feedContainer.style.opacity = '1';
                showNotification('All filters cleared', 'success', 2000);
            }, 200);
        });

        // Help modal with comprehensive tips
        elements.helpBtn.addEventListener('click', () => {
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
                backdrop-filter: blur(5px);
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

                    <button class="button" onclick="this.closest('div[style*=\"position: fixed\"]').remove()" style="width: 100%; margin-top: 20px;">
                        Got it! Close
                    </button>
                </div>
            `;
            document.body.appendChild(helpModal);
            helpModal.addEventListener('click', (e) => {
                if (e.target === helpModal) helpModal.remove();
            });
        });

        // Enhanced keyboard shortcuts with better UX
        document.addEventListener('keydown', (e) => {
            // Don't interfere with input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                if (e.key === 'Escape') {
                    e.target.blur();
                    showNotification('Search cleared', 'info', 1500);
                }
                // Allow Ctrl/Cmd + K to clear search
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    if (e.target === elements.searchInput) {
                        elements.searchInput.value = '';
                        state.searchQuery = '';
                        applyFilters();
                        showNotification('Search cleared', 'info', 1500);
                    }
                }
                return;
            }
            
            // Global shortcuts
            if (e.key === '/' || e.key === 'f' || ((e.ctrlKey || e.metaKey) && e.key === 'k')) {
                e.preventDefault();
                elements.searchInput.focus();
                elements.searchInput.select();
                showNotification('Search focused. Type to search articles.', 'info', 2000);
            } else if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (headerRefreshBtn && !headerRefreshBtn.disabled) {
                    headerRefreshBtn.click();
                } else {
                    fetchAllFeeds();
                }
            } else if (e.key === 'Escape') {
                const modals = document.querySelectorAll('div[style*="position: fixed"][style*="z-index: 10000"]');
                modals.forEach(modal => modal.remove());
                // Also clear search if focused
                if (document.activeElement === elements.searchInput && elements.searchInput.value) {
                    elements.searchInput.value = '';
                    state.searchQuery = '';
                    applyFilters();
                }
            } else if (e.key === '?' || ((e.ctrlKey || e.metaKey) && e.key === '/')) {
                e.preventDefault();
                elements.helpBtn.click();
            }
        });

        // Initialize with better UX
        let isInitialized = false;
        function init() {
            // Prevent duplicate initialization
            if (isInitialized) {
                return;
            }
            isInitialized = true;
            
            // Show loading immediately
            elements.loadingMessage.style.display = 'flex';
            
            // Load preferences
            loadPreferences();
            
            // Restore welcome banner state
            const welcomeBanner = document.getElementById('welcomeBanner');
            if (welcomeBanner && localStorage.getItem('welcomeBannerDismissed') === 'true') {
                welcomeBanner.classList.add('hidden');
            }
            
            // Fetch feeds with error handling
            fetchAllFeeds().then(() => {
                // Initialize filters after data is loaded
                if (state.selectedSources.size === 0 && state.allItems.length > 0) {
                    const loadedSources = new Set(state.allItems.map(item => item.sourceName));
                    state.selectedSources = new Set(loadedSources);
                    savePreferences();
                }
                initializeSourceFilters();
                applyFilters();
                if (state.autoRefreshEnabled) {
                    startAutoRefresh();
                }
            }).catch(error => {
                // Log initialization errors
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.error('Initialization error:', error);
                }
                elements.loadingMessage.style.display = 'none';
                elements.errorMessage.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 12px; align-items: center;">
                        <div style="font-size: 2em;">⚠️</div>
                        <div><strong>Failed to initialize</strong></div>
                        <div style="font-size: 0.9em; color: #999;">
                            ${error.message || 'An unexpected error occurred'}
                        </div>
                        <button class="button" onclick="location.reload()" style="margin-top: 12px;">
                            Reload Page
                        </button>
                    </div>
                `;
                elements.errorMessage.style.display = 'block';
                isInitialized = false; // Allow retry
            });
        }

        // Handle page visibility changes for better UX
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && state.autoRefreshEnabled) {
                // Page became visible - check if refresh is needed
                const lastRefresh = localStorage.getItem('lastFeedRefresh');
                if (lastRefresh) {
                    const timeSinceRefresh = Date.now() - parseInt(lastRefresh);
                    if (timeSinceRefresh > CONFIG.AUTO_REFRESH_INTERVAL) {
                        // Auto-refresh if it's been more than the interval
                        fetchAllFeeds();
                    }
                }
            }
        });

        // Initialize on load with proper timing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(init, 50); // Small delay to ensure DOM is ready
            });
        } else {
            // DOM already loaded
            setTimeout(init, 50);
        }
        
        // Fallback initialization check
        window.addEventListener('load', () => {
            if (!isInitialized && state.allItems.length === 0) {
                setTimeout(init, 100);
            }
        });
    
