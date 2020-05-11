const { range } = require('./array')
const LIMIT = 100
const pagingData = (query = {}) => {
  const data = {
    page: 0,
    limit: LIMIT,
    sort: 'desc',
    total: 0,
    ...query
  }
  data.limit = +data.limit
  data.page = +data.page
  return data
}

const redisPageRange = (query, total, prefix) => {
  const paging = pagingData({ ...query, total })
  let getRange = []
  if (paging.sort.toLowerCase() === 'desc') {
    const startAt = total - paging.limit - (paging.limit * (paging.page)) + 1
    getRange = range(startAt, paging.limit, true).map(i => `${prefix}${i}`).reverse()
  } else {
    const startAt = 1 + paging.limit * paging.page
    getRange = range(startAt, paging.limit, true).map(i => `${prefix}${i}`)
  }
  return {
    paging,
    getRange
  }
}

module.exports = {
  pagingData,
  redisPageRange
}
