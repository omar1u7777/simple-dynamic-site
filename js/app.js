// Enkel state-variabel
var state = {
  posts: [],
  filteredPosts: [],
  commentsByPost: {},
  usersById: {},
  postsSkip: 0,
  postsLimit: 8,
  postsTotal: 0,
  allComments: [],
  allTags: [],
  searchQuery: '',
  selectedTag: '',
  theme: 'light',
  currentPage: 1,
  postsPerPage: 8,
  totalPages: 1
}

const el = (s) => document.querySelector(s);

const elAll = (s) => document.querySelectorAll(s);
/**
 * Sets up navigation: toggles mobile menu and marks active link.
 */
function setupNav() {
  var navToggle = el('.nav-toggle')
  var navLinks = el('.nav-links')
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      if (navLinks.classList.contains('show')) {
        navLinks.classList.remove('show')
      } else {
        navLinks.classList.add('show')
      }
    })
  }

  var page = document.body.dataset.page
  var links = elAll('.nav-links a')
  for (var i = 0; i < links.length; i++) {
    var a = links[i]
    if (a.dataset && a.dataset.nav === page) {
      a.classList.add('active')
    }
  }
}

/**
 * Opens a modal dialog with the provided HTML content.
 * @param {string} html - The HTML content to display in the modal.
 */
function openModal(html) {
  var modal = el('#modal')
  if (!modal) return
  // Lägg till aria-label för bättre tillgänglighet
  modal.innerHTML = '<div class="dialog" role="dialog" aria-label="Användarprofil">' + html + '<div style="text-align:right;margin-top:0.6rem"><button id="close-modal" class="btn">Stäng</button></div></div>'
  modal.setAttribute('aria-hidden', 'false')
  var closeBtn = el('#close-modal')
  if (closeBtn) {
    closeBtn.focus()
    closeBtn.addEventListener('click', function () { closeModal() })
  }
}

/**
 * Closes the modal dialog.
 */
function closeModal() {
  var modal = el('#modal')
  if (!modal) return
  modal.setAttribute('aria-hidden', 'true')
  modal.innerHTML = ''
}

/**
 * Renders and opens a modal with user profile information.
 * @param {object} user - The user object to display.
 */
function renderUserProfile(user) {
  if (!user) {
    openModal('<p>Användare hittades inte.</p>')
    return
  }
  var html = ''
  // Escape användardata för att undvika XSS
  var safeFirst = escapeHtml(user.firstName)
  var safeLast = escapeHtml(user.lastName)
  var safeEmail = escapeHtml(user.email)
  var safePhone = user.phone ? escapeHtml(user.phone) : '-'
  var safeAddress = ''
  if (user.address && user.address.address) {
    var pa = escapeHtml(user.address.address)
    var pc = user.address.city ? escapeHtml(user.address.city) : ''
    safeAddress = pa + (pc ? ', ' + pc : '')
  }
  var company = '-'
  if (user.company && user.company.name) company = escapeHtml(user.company.name)

  html += '<h2>' + safeFirst + ' ' + safeLast + '</h2>'
  html += '<p><strong>E-post:</strong> <a href="mailto:' + safeEmail + '">' + safeEmail + '</a></p>'
  html += '<p><strong>Telefon:</strong> ' + safePhone + '</p>'
  html += '<p><strong>Adress:</strong> ' + safeAddress + '</p>'
  html += '<p><strong>Företag:</strong> ' + company + '</p>'
  // Lägg till profilbild om det finns en bild-URL
  var imgHtml = ''
  if (user.image) {
    imgHtml = '<img src="' + user.image + '" alt="Profilbild för ' + escapeHtml(user.firstName + ' ' + user.lastName) + '" class="avatar" width="80" height="80" loading="lazy">'
  } else if (user.avatar) {
    imgHtml = '<img src="' + user.avatar + '" alt="Profilbild för ' + escapeHtml(user.firstName + ' ' + user.lastName) + '" class="avatar" width="80" height="80" loading="lazy">'
  } else {
    // Fallback-bild: använder lokal bild `omar.jpg` i projektroten, annars extern placeholder
    imgHtml = '<img src="./assets/images/omar.jpg" alt="Profilbild för ' + escapeHtml(user.firstName + ' ' + user.lastName) + '" class="avatar" width="80" height="80" loading="lazy" onerror="this.onerror=null;this.src=\'https://via.placeholder.com/80?text=User\'">'
  }

  openModal(imgHtml + html)
}

/**
 * Loads initial posts, users, and comments, then renders them.
 */
async function loadInitialPosts() {
  var postsListEl = el('#posts-list')
  var loadBtn = el('#load-more')
  var postsMsg = el('#posts-message')
  try {
    toggleLoadingSpinner(true)

    // Hämta användare, inlägg och alla kommentarer parallellt
    var [users, postsData, allComments] = await Promise.all([
      API.fetchAllUsers(),
      API.fetchPosts(state.postsLimit, state.postsSkip),
      API.fetchAllComments()
    ])

    console.log('Users fetched:', users.length)
    console.log('Posts fetched:', postsData.posts.length)
    console.log('All comments fetched:', allComments.length)

    // Spara användare i ett objekt för snabb åtkomst
    for (var i = 0; i < users.length; i++) {
      var u = users[i]
      state.usersById[u.id] = u
    }
    

    // Spara alla kommentarer i state
    state.allComments = allComments

    state.postsTotal = postsData.total ? postsData.total : 0
    state.posts = postsData.posts.slice()
    state.postsSkip = state.postsSkip + state.posts.length

    // Koppla kommentarer till inlägg baserat på postId
    for (var i = 0; i < state.posts.length; i++) {
      var postId = state.posts[i].id
      state.commentsByPost[postId] = allComments.filter(c => c.postId === postId)
    }

    // Samla alla unika taggar
    collectAllTags(state.posts)

    // Initiera filtrerade inlägg och paginering
    state.filteredPosts = state.posts.slice()
    state.totalPages = Math.ceil(state.postsTotal / state.postsPerPage)
    state.currentPage = 1

    renderPostsForPage(state.currentPage)
    populateTagFilter()
    updatePaginationControls()
    toggleLoadingSpinner(false)

    if (state.postsSkip >= state.postsTotal && loadBtn) {
      loadBtn.disabled = true
    }
    if (postsMsg) postsMsg.textContent = 'Visar ' + state.filteredPosts.length + ' av ' + state.postsTotal + ' inlägg'
  } catch (err) {
    toggleLoadingSpinner(false)
    showError('Kunde inte ladda inlägg: ' + err.message, postsListEl)
  }
}

/**
 * Renders a list of posts in the DOM.
 * @param {array} posts - Array of post objects to render.
 */
function renderPosts(posts) {
  var container = el('#posts-list')
  if (!container) return
  if (!posts || posts.length === 0) {
    container.innerHTML = '<p class="muted">Inga inlägg tillgängliga.</p>'
    return
  }
  container.innerHTML = ''

  for (var i = 0; i < posts.length; i++) {
    var p = posts[i]
    var user = state.usersById[p.userId]
    
    var article = document.createElement('article')
    article.className = 'post'

    var username = user && user.username ? user.username : 'Okänd'
    var reactions = (p.reactions && typeof p.reactions === 'object' && p.reactions.likes !== undefined) ? p.reactions.likes : (p.reactions || 0)

    var html = ''
    html += '<div class="post-username"><a href="#" class="username" data-uid="' + p.userId + '">' + escapeHtml(username) + '</a></div>'
    html += '<h3>' + escapeHtml(p.title) + '</h3>'
    html += '<div class="meta"><div class="muted">Reaktioner: ' + reactions + '</div></div>'
    html += '<p>' + escapeHtml(p.body) + '</p>'

    // Taggar
    html += '<div class="tags">'
    if (p.tags && p.tags.length > 0) {
      for (var t = 0; t < p.tags.length; t++) {
        html += '<span class="tag">' + escapeHtml(p.tags[t]) + '</span>'
      }
    }
    html += '</div>'

    // Kommentarer
    var commentsHtml = renderCommentsForPost(p.id)

    html += '<div class="comments"><strong>Kommentarer:</strong><div class="comments-list">' + commentsHtml + '</div></div>'
    html += '<div class="post-id">'
    html += '<a href="post-detail.html?post=' + p.id + '" class="read-more-link">Läs mer →</a> | '
    html += '<button class="share-btn" onclick="sharePost(' + p.id + ', \'' + escapeHtml(p.title) + '\')" title="Dela inlägg">🔗 Dela</button> | '
    html += 'ID: ' + p.id + '</div>'

    article.innerHTML = html
    container.appendChild(article)
  }

  // Lägg till klicklyssnare för användarnamn
  var usernameLinks = elAll('.username')
  for (var k = 0; k < usernameLinks.length; k++) {
    (function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault()
        var uid = Number(link.getAttribute('data-uid'))
        var u = state.usersById[uid]
        renderUserProfile(u)
      })
    })(usernameLinks[k])
  }
}

/**
 * Renders HTML for comments of a specific post.
 * @param {number} postId - The ID of the post.
 * @returns {string} HTML string of comments.
 */
function renderCommentsForPost(postId) {
  var list = state.commentsByPost[postId]
  if (!list || list.length === 0) return '<p class="muted">Inga kommentarer tillgängliga.</p>'
  var out = ''
  for (var i = 0; i < list.length; i++) {
    var c = list[i]
    var user = c.user
    var name = user ? user.username : 'N/A'
    out += '<div class="comment"><strong>' + escapeHtml(name) + '</strong>: ' + escapeHtml(c.body) + '</div>'
  }
  return out
}

/**
 * Loads more posts and appends them to the list.
 */
async function loadMorePosts() {
  var loadBtn = el('#load-more')
  var msg = el('#posts-message')
  try {
    if (loadBtn) loadBtn.disabled = true
    if (loadBtn) loadBtn.textContent = 'Laddar...'
    var postsData = await API.fetchPosts(state.postsLimit, state.postsSkip)
    var newPosts = postsData.posts || []

    // Koppla kommentarer till nya inlägg från redan hämtade kommentarer
    for (var i = 0; i < newPosts.length; i++) {
      var postId = newPosts[i].id
      state.commentsByPost[postId] = state.allComments.filter(c => c.postId === postId)
    }

    // För paginering, ladda inte fler inlägg - använd befintliga
    // Detta är en förenkling - i en riktig app skulle vi behöva ladda alla inlägg först
    if (loadBtn) loadBtn.disabled = true
    if (msg) msg.textContent = 'Alla inlägg är redan laddade för paginering'
  } catch (err) {
    var postsMsgEl = el('#posts-message')
    if (postsMsgEl) postsMsgEl.textContent = 'Fel vid inläsning av fler: ' + err.message
  } finally {
    if (loadBtn) loadBtn.disabled = state.postsSkip >= state.postsTotal
    if (loadBtn) loadBtn.textContent = 'Ladda fler'
  }
}


/**
 * Sets up contact form validation and submission.
 */
function setupContact() {
  var nameInput = el('#name')
  var emailInput = el('#email')
  var confirmBox = el('#confirm')
  var sendBtn = el('#send-btn')
  var form = el('#contact-form')
  var msg = el('#form-message')

  function validateName() {
    var v = nameInput.value.trim()
    var ok = v !== '' && !/\d/.test(v)
    var errEl = el('#error-name')
    if (errEl) errEl.textContent = ok ? '' : 'Namn får inte innehålla siffror och får inte vara tomt.'
    return ok
  }

  function validateEmail() {
    var v = emailInput.value.trim()
    var ok = v.indexOf('@') > 0 && v.indexOf('.') > 0
    var errEl = el('#error-email')
    if (errEl) errEl.textContent = ok ? '' : 'Ange en giltig e-post med "@" och ".".'
    return ok
  }

  function validateConfirm() {
    var ok = confirmBox.checked
    var errEl = el('#error-confirm')
    if (errEl) errEl.textContent = ok ? '' : 'Du måste bekräfta för att skicka.'
    if (sendBtn) sendBtn.disabled = !ok
    return ok
  }

  if (nameInput) nameInput.addEventListener('input', validateName)
  if (emailInput) emailInput.addEventListener('input', validateEmail)
  if (confirmBox) confirmBox.addEventListener('change', validateConfirm)

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault()
      var nok = !validateName()
      var eok = !validateEmail()
      var cok = !validateConfirm()
      if (nok || eok || cok) {
        if (msg) msg.textContent = 'Åtgärda fel innan du skickar.'
        return
      }
      if (msg) msg.textContent = 'Meddelandet skickades (simulerat). Tack.'
      form.reset()
      if (sendBtn) sendBtn.disabled = true
    })
  }
}

/**
 * Escapes HTML characters to prevent XSS.
 * @param {string} text - The text to escape.
 * @returns {string} Escaped text.
 */
function escapeHtml(text) {
  if (text === undefined || text === null) return ''
  var s = String(text)
  s = s.replace(/&/g, '&amp;')
  s = s.replace(/</g, '&lt;')
  s = s.replace(/>/g, '&gt;')
  s = s.replace(/"/g, '&quot;')
  s = s.replace(/'/g, '&#039;')
  return s
}

/**
 * Collects all unique tags from posts.
 * @param {array} posts - Array of post objects.
 */
function collectAllTags(posts) {
  var tagSet = new Set()
  for (var i = 0; i < posts.length; i++) {
    var post = posts[i]
    if (post.tags && Array.isArray(post.tags)) {
      for (var j = 0; j < post.tags.length; j++) {
        tagSet.add(post.tags[j])
      }
    }
  }
  state.allTags = Array.from(tagSet).sort()
}

/**
 * Populates the tag filter dropdown.
 */
function populateTagFilter() {
  var tagFilter = el('#tag-filter')
  if (!tagFilter) return

  // Clear existing options except the first one
  while (tagFilter.options.length > 1) {
    tagFilter.remove(1)
  }

  // Add tag options
  for (var i = 0; i < state.allTags.length; i++) {
    var option = document.createElement('option')
    option.value = state.allTags[i]
    option.textContent = state.allTags[i]
    tagFilter.appendChild(option)
  }
}

/**
 * Applies search and tag filters to posts.
 */
function applyFilters() {
  var filtered = state.posts.slice()

  // Apply search filter
  if (state.searchQuery.trim()) {
    var query = state.searchQuery.toLowerCase()
    filtered = filtered.filter(function(post) {
      return post.title.toLowerCase().includes(query) ||
             post.body.toLowerCase().includes(query) ||
             (post.tags && post.tags.some(tag => tag.toLowerCase().includes(query)))
    })
  }

  // Apply tag filter
  if (state.selectedTag) {
    filtered = filtered.filter(function(post) {
      return post.tags && post.tags.includes(state.selectedTag)
    })
  }

  state.filteredPosts = filtered
  state.totalPages = Math.ceil(state.filteredPosts.length / state.postsPerPage)
  state.currentPage = 1
}

/**
 * Renders posts for a specific page.
 * @param {number} page - The page number to render.
 */
function renderPostsForPage(page) {
  var startIndex = (page - 1) * state.postsPerPage
  var endIndex = startIndex + state.postsPerPage
  var postsForPage = state.filteredPosts.slice(startIndex, endIndex)

  renderPosts(postsForPage)
}

/**
 * Updates the pagination controls.
 */
function updatePaginationControls() {
  var paginationEl = el('#pagination-controls')
  var pageInfoEl = el('#page-info')
  var prevBtn = el('#prev-page')
  var nextBtn = el('#next-page')
  var loadMoreBtn = el('#load-more')

  if (state.totalPages > 1) {
    // Show pagination
    if (paginationEl) paginationEl.style.display = 'flex'
    if (loadMoreBtn) loadMoreBtn.style.display = 'none'

    if (pageInfoEl) pageInfoEl.textContent = 'Sida ' + state.currentPage + ' av ' + state.totalPages
    if (prevBtn) prevBtn.disabled = state.currentPage <= 1
    if (nextBtn) nextBtn.disabled = state.currentPage >= state.totalPages
  } else {
    // Show load more button for single page
    if (paginationEl) paginationEl.style.display = 'none'
    if (loadMoreBtn) loadMoreBtn.style.display = 'inline-block'
  }
}

/**
 * Goes to the previous page.
 */
function goToPrevPage() {
  if (state.currentPage > 1) {
    state.currentPage--
    renderPostsForPage(state.currentPage)
    updatePaginationControls()
  }
}

/**
 * Goes to the next page.
 */
function goToNextPage() {
  if (state.currentPage < state.totalPages) {
    state.currentPage++
    renderPostsForPage(state.currentPage)
    updatePaginationControls()
  }
}

/**
 * Shares a post using the Web Share API or fallback to clipboard.
 * @param {number} postId - The ID of the post to share.
 * @param {string} title - The title of the post.
 */
function sharePost(postId, title) {
  var url = window.location.origin + '/post-detail.html?post=' + postId

  if (navigator.share) {
    // Use Web Share API if available
    navigator.share({
      title: title,
      text: 'Kolla detta inlägg: ' + title,
      url: url
    }).catch(function(err) {
      console.log('Error sharing:', err)
      fallbackShare(url, title)
    })
  } else {
    fallbackShare(url, title)
  }
}

/**
 * Fallback sharing method using clipboard.
 * @param {string} url - The URL to share.
 * @param {string} title - The title of the post.
 */
function fallbackShare(url, title) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(function() {
      showNotification('Länk kopierad till urklipp! Dela: ' + title, 'success')
    }).catch(function(err) {
      console.error('Failed to copy:', err)
      showNotification('Kunde inte kopiera länk. Länken är: ' + url, 'error')
    })
  } else {
    // Fallback for older browsers
    var textArea = document.createElement('textarea')
    textArea.value = url
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      showNotification('Länk kopierad till urklipp! Dela: ' + title, 'success')
    } catch (err) {
      showNotification('Kunde inte kopiera länk. Länken är: ' + url, 'error')
    }
    document.body.removeChild(textArea)
  }
}

/**
 * Shows a notification message to the user.
 * @param {string} message - The message to display.
 * @param {string} type - The type of notification ('success', 'error', 'info').
 */
function showNotification(message, type) {
  // Remove existing notifications
  var existingNotifications = document.querySelectorAll('.notification')
  existingNotifications.forEach(function(notification) {
    document.body.removeChild(notification)
  })

  // Create new notification
  var notification = document.createElement('div')
  notification.className = 'notification notification-' + type
  notification.textContent = message

  // Style the notification
  notification.style.position = 'fixed'
  notification.style.top = '20px'
  notification.style.right = '20px'
  notification.style.padding = '1rem 1.5rem'
  notification.style.borderRadius = '6px'
  notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
  notification.style.zIndex = '10000'
  notification.style.maxWidth = '400px'
  notification.style.fontWeight = '500'

  if (type === 'success') {
    notification.style.background = '#d4edda'
    notification.style.color = '#155724'
    notification.style.border = '1px solid #c3e6cb'
  } else if (type === 'error') {
    notification.style.background = '#f8d7da'
    notification.style.color = '#721c24'
    notification.style.border = '1px solid #f5c6cb'
  } else {
    notification.style.background = '#d1ecf1'
    notification.style.color = '#0c5460'
    notification.style.border = '1px solid #bee5eb'
  }

  document.body.appendChild(notification)

  // Auto-remove after 3 seconds
  setTimeout(function() {
    if (notification.parentNode) {
      document.body.removeChild(notification)
    }
  }, 3000)
}

/**
 * Shows an error message to the user.
 * @param {string} message - The error message.
 * @param {Element} container - The container element to show error in.
 */
function showError(message, container) {
  if (container) {
    container.innerHTML = '<div class="error-message"><h3>Ett fel uppstod</h3><p>' + escapeHtml(message) + '</p><button class="btn" onclick="location.reload()">Ladda om sidan</button></div>'
  } else {
    showNotification(message, 'error')
  }
}

/**
 * Shows or hides the loading spinner.
 * @param {boolean} show - Whether to show the spinner.
 */
function toggleLoadingSpinner(show) {
  var spinner = el('#loading-spinner')
  var postsList = el('#posts-list')
  if (spinner && postsList) {
    if (show) {
      postsList.innerHTML = ''
      spinner.style.display = 'flex'
    } else {
      spinner.style.display = 'none'
    }
  }
}

/**
 * Toggles between light and dark theme.
 */
function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', state.theme)
  localStorage.setItem('theme', state.theme)

  // Update button text
  var themeBtn = el('#theme-toggle')
  if (themeBtn) {
    themeBtn.textContent = state.theme === 'dark' ? '☀️ Ljust läge' : '🌙 Mörkt läge'
  }
}

/**
 * Loads user preferences from localStorage.
 */
function loadUserPreferences() {
  var savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    state.theme = savedTheme
    document.documentElement.setAttribute('data-theme', state.theme)
  }

  var themeBtn = el('#theme-toggle')
  if (themeBtn) {
    themeBtn.textContent = state.theme === 'dark' ? '☀️ Ljust läge' : '🌙 Mörkt läge'
  }
}

/**
 * Loads and displays a detailed view of a single post.
 * @param {number} postId - The ID of the post to display.
 */
async function loadPostDetail(postId) {
  var loadingEl = el('#post-detail-loading')
  var contentEl = el('#post-detail-content')
  var actionsEl = el('#post-detail-actions')
  var errorEl = el('#error-message')

  try {
    // Show loading
    if (loadingEl) loadingEl.style.display = 'flex'
    if (contentEl) contentEl.style.display = 'none'
    if (actionsEl) actionsEl.style.display = 'none'
    if (errorEl) errorEl.style.display = 'none'

    // Fetch post data
    var [users, postData, comments] = await Promise.all([
      API.fetchAllUsers(),
      API.fetchPosts(1, 0).then(data => data.posts.find(p => p.id === postId)),
      API.fetchCommentsForPost(postId)
    ])

    if (!postData) {
      throw new Error('Inlägget hittades inte')
    }

    // Store users for profile modal
    for (var i = 0; i < users.length; i++) {
      var u = users[i]
      state.usersById[u.id] = u
    }

    // Render post detail
    renderPostDetail(postData, comments, users)

    // Update page title and meta tags
    updatePageMeta(postData)

    // Hide loading, show content
    if (loadingEl) loadingEl.style.display = 'none'
    if (contentEl) contentEl.style.display = 'block'
    if (actionsEl) actionsEl.style.display = 'flex'

  } catch (err) {
    console.error('Error loading post detail:', err)
    if (loadingEl) loadingEl.style.display = 'none'
    if (errorEl) errorEl.style.display = 'block'

    var retryBtn = el('#retry-btn')
    if (retryBtn) {
      retryBtn.onclick = function() { loadPostDetail(postId) }
    }

    showError('Kunde inte ladda inlägget: ' + err.message)
  }
}

/**
 * Renders the detailed view of a post.
 * @param {object} post - The post object.
 * @param {array} comments - Array of comments for the post.
 * @param {array} users - Array of all users.
 */
function renderPostDetail(post, comments, users) {
  var container = el('#post-detail-content')
  if (!container) return

  var user = users.find(u => u.id === post.userId)
  var username = user ? user.username : 'Okänd'
  var reactions = (post.reactions && typeof post.reactions === 'object' && post.reactions.likes !== undefined) ? post.reactions.likes : (post.reactions || 0)

  var html = ''
  html += '<h1>' + escapeHtml(post.title) + '</h1>'
  html += '<div class="post-meta">'
  html += '<div class="post-author">'
  html += '<a href="#" class="username" data-uid="' + post.userId + '">' + escapeHtml(username) + '</a>'
  html += '</div>'
  html += '<div class="post-date">Reaktioner: ' + reactions + '</div>'
  html += '</div>'

  html += '<div class="post-content">' + escapeHtml(post.body) + '</div>'

  if (post.tags && post.tags.length > 0) {
    html += '<div class="post-tags">'
    html += '<strong>Taggar:</strong> '
    for (var i = 0; i < post.tags.length; i++) {
      html += '<span class="tag">' + escapeHtml(post.tags[i]) + '</span>'
    }
    html += '</div>'
  }

  if (comments && comments.length > 0) {
    html += '<div class="comments-section">'
    html += '<h2>Kommentarer (' + comments.length + ')</h2>'
    for (var i = 0; i < comments.length; i++) {
      var comment = comments[i]
      var commentUser = comment.user || {}
      var commentUsername = commentUser.username || 'Anonym'
      html += '<div class="comment">'
      html += '<strong>' + escapeHtml(commentUsername) + ':</strong> ' + escapeHtml(comment.body)
      html += '</div>'
    }
    html += '</div>'
  }

  container.innerHTML = html

  // Add click listeners for usernames
  var usernameLinks = container.querySelectorAll('.username')
  for (var k = 0; k < usernameLinks.length; k++) {
    (function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault()
        var uid = Number(link.getAttribute('data-uid'))
        var u = state.usersById[uid]
        renderUserProfile(u)
      })
    })(usernameLinks[k])
  }

  // Setup sharing buttons
  setupShareButtons(post)
}

/**
 * Updates page title and meta tags for SEO.
 * @param {object} post - The post object.
 */
function updatePageMeta(post) {
  document.title = escapeHtml(post.title) + ' - Min Sida'

  // Update meta tags
  var description = post.body.substring(0, 160) + '...'
  updateMetaTag('description', description)
  updateMetaTag('og:title', post.title)
  updateMetaTag('og:description', description)
  updateMetaTag('og:url', window.location.href)
}

/**
 * Updates or creates a meta tag.
 * @param {string} name - Meta tag name.
 * @param {string} content - Meta tag content.
 */
function updateMetaTag(name, content) {
  var meta = document.querySelector('meta[name="' + name + '"]') ||
             document.querySelector('meta[property="' + name + '"]')
  if (meta) {
    meta.setAttribute('content', content)
  } else {
    meta = document.createElement('meta')
    meta.setAttribute(name.includes('og:') ? 'property' : 'name', name)
    meta.setAttribute('content', content)
    document.head.appendChild(meta)
  }
}

/**
 * Sets up share buttons for the post.
 * @param {object} post - The post object.
 */
function setupShareButtons(post) {
  var shareContainer = el('#share-buttons')
  if (!shareContainer) return

  var url = window.location.href
  var title = encodeURIComponent(post.title)
  var text = encodeURIComponent(post.body.substring(0, 100) + '...')

  var shareButtons = [
    {
      name: 'Facebook',
      icon: '📘',
      url: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url)
    },
    {
      name: 'Twitter',
      icon: '🐦',
      url: 'https://twitter.com/intent/tweet?text=' + title + '&url=' + encodeURIComponent(url)
    },
    {
      name: 'LinkedIn',
      icon: '💼',
      url: 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url)
    },
    {
      name: 'Kopiera länk',
      icon: '🔗',
      action: function() {
        navigator.clipboard.writeText(url).then(function() {
          alert('Länk kopierad till urklipp!')
        })
      }
    }
  ]

  var html = ''
  for (var i = 0; i < shareButtons.length; i++) {
    var btn = shareButtons[i]
    if (btn.action) {
      html += '<button class="share-btn" onclick="' + btn.action.toString().replace('function() {', '').replace('}', '') + '">' + btn.icon + ' ' + btn.name + '</button>'
    } else {
      html += '<a href="' + btn.url + '" target="_blank" class="share-btn">' + btn.icon + ' ' + btn.name + '</a>'
    }
  }

  shareContainer.innerHTML = html
}

/**
 * Initializes the application based on the current page.
 */
document.addEventListener('DOMContentLoaded', function () {
  setupNav()
  loadUserPreferences()

  var page = document.body.dataset.page
  if (page === 'posts') {
    toggleLoadingSpinner(true)
    loadInitialPosts()

    var loadBtn = el('#load-more')
    if (loadBtn) loadBtn.addEventListener('click', loadMorePosts)

    var modalEl = el('#modal')
    if (modalEl) {
      modalEl.addEventListener('click', function (e) { if (e.target.id === 'modal') closeModal() })
    }

    // Search functionality
    var searchInput = el('#search-input')
    var searchBtn = el('#search-btn')
    if (searchInput && searchBtn) {
      searchBtn.addEventListener('click', function() {
        state.searchQuery = searchInput.value
        applyFilters()
        renderPostsForPage(state.currentPage)
        updatePaginationControls()
      })

      searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          state.searchQuery = searchInput.value
          applyFilters()
          renderPostsForPage(state.currentPage)
          updatePaginationControls()
        }
      })
    }

    // Tag filter
    var tagFilter = el('#tag-filter')
    if (tagFilter) {
      tagFilter.addEventListener('change', function() {
        state.selectedTag = tagFilter.value
        applyFilters()
        renderPostsForPage(state.currentPage)
        updatePaginationControls()
      })
    }

    // Clear filters
    var clearBtn = el('#clear-filters')
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        state.searchQuery = ''
        state.selectedTag = ''
        if (searchInput) searchInput.value = ''
        if (tagFilter) tagFilter.value = ''
        applyFilters()
        renderPostsForPage(state.currentPage)
        updatePaginationControls()
      })
    }

    // Pagination controls
    var prevBtn = el('#prev-page')
    var nextBtn = el('#next-page')
    if (prevBtn) prevBtn.addEventListener('click', goToPrevPage)
    if (nextBtn) nextBtn.addEventListener('click', goToNextPage)

    // Theme toggle
    var themeBtn = el('#theme-toggle')
    if (themeBtn) {
      themeBtn.addEventListener('click', toggleTheme)
    }
  } else if (page === 'post-detail') {
    // Get post ID from URL parameters
    var urlParams = new URLSearchParams(window.location.search)
    var postId = parseInt(urlParams.get('post'))
    if (postId) {
      loadPostDetail(postId)
    } else {
      el('#error-message').style.display = 'block'
    }

    // Back to posts button
    var backBtn = el('#back-to-posts')
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        window.location.href = 'posts.html'
      })
    }

    // Modal functionality
    var modalEl = el('#modal')
    if (modalEl) {
      modalEl.addEventListener('click', function (e) { if (e.target.id === 'modal') closeModal() })
    }
  } else if (page === 'contact') {
    setupContact()
  }
})
