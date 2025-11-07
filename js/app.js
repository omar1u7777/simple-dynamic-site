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
  theme: 'light'
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

    // Initiera filtrerade inlägg
    state.filteredPosts = state.posts.slice()

    renderPosts(state.filteredPosts)
    populateTagFilter()
    toggleLoadingSpinner(false)

    if (state.postsSkip >= state.postsTotal && loadBtn) {
      loadBtn.disabled = true
    }
    if (postsMsg) postsMsg.textContent = 'Visar ' + state.filteredPosts.length + ' av ' + state.postsTotal + ' inlägg'
  } catch (err) {
    toggleLoadingSpinner(false)
    if (postsListEl) postsListEl.innerHTML = '<p class="muted">Fel vid inläsning av inlägg: ' + err.message + '</p>'
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
    html += '<div class="post-id">Inlägg ID: ' + p.id + '</div>'

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

    // Lägg till nya inlägg
    state.posts = state.posts.concat(newPosts)
    state.postsSkip = state.postsSkip + newPosts.length

    // Uppdatera taggar och filtrera
    collectAllTags(state.posts)
    applyFilters()

    renderPosts(state.filteredPosts)
    populateTagFilter()
    if (state.postsSkip >= (postsData.total || state.postsTotal) && loadBtn) loadBtn.disabled = true
    if (msg) msg.textContent = 'Visar ' + state.filteredPosts.length + ' av ' + (postsData.total || state.postsTotal) + ' inlägg'
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
        renderPosts(state.filteredPosts)
      })

      searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          state.searchQuery = searchInput.value
          applyFilters()
          renderPosts(state.filteredPosts)
        }
      })
    }

    // Tag filter
    var tagFilter = el('#tag-filter')
    if (tagFilter) {
      tagFilter.addEventListener('change', function() {
        state.selectedTag = tagFilter.value
        applyFilters()
        renderPosts(state.filteredPosts)
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
        renderPosts(state.filteredPosts)
      })
    }

    // Theme toggle
    var themeBtn = el('#theme-toggle')
    if (themeBtn) {
      themeBtn.addEventListener('click', toggleTheme)
    }
  } else if (page === 'contact') {
    setupContact()
  }
})
