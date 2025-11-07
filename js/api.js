// Enkel API-modul: hämtar data från DummyJSON
const API = {
  base: 'https://dummyjson.com',

  // Hämta inlägg med limit och skip
  async fetchPosts(limit, skip) {
    if (limit === undefined) limit = 10
    if (skip === undefined) skip = 0
    const url = this.base + '/posts?limit=' + limit + '&skip=' + skip
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error('Kunde inte hämta inlägg')
    }
    const data = await res.json()
    return data
  },

  // Hämta kommentarer
  async fetchComments(limit, skip) {
    if (limit === undefined) limit = 100
    if (skip === undefined) skip = 0
    const url = this.base + '/comments?limit=' + limit + '&skip=' + skip
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error('Kunde inte hämta kommentarer')
    }
    const data = await res.json()
    return data
  },

  // Hämta alla kommentarer
  async fetchAllComments() {
    const allComments = []
    let skip = 0
    const limit = 100
    while (true) {
      const data = await this.fetchComments(limit, skip)
      allComments.push(...data.comments)
      if (allComments.length >= data.total) break
      skip += limit
    }
    return allComments
  },

  // Hämta användare med limit och skip
  async fetchUsers(limit, skip) {
    if (limit === undefined) limit = 100
    if (skip === undefined) skip = 0
    const url = this.base + '/users?limit=' + limit + '&skip=' + skip
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error('Kunde inte hämta användare')
    }
    const data = await res.json()
    return data
  },

  // Hämta alla användare genom paginering
  async fetchAllUsers() {
    const allUsers = []
    let skip = 0
    const limit = 100
    while (true) {
      const data = await this.fetchUsers(limit, skip)
      allUsers.push(...data.users)
      if (allUsers.length >= data.total) break
      skip += limit
    }
    return allUsers
  },

  // Hämta kommentarer för ett specifikt inlägg
  async fetchCommentsForPost(postId) {
    const url = this.base + '/posts/' + postId + '/comments'
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error('Kunde inte hämta kommentarer för inlägg ' + postId)
    }
    const data = await res.json()
    return data.comments || []
  }
}
