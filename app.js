require('dotenv').config()
const express = require('express')
const errorHandler = require('errorhandler')
const logger = require('morgan')
const methodOverride = require('method-override')
const path = require('path')
const app = express()
const port = 3000

// MiddleWare
app.use(logger('dev'))
app.use(errorHandler())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(methodOverride())

const Prismic = require('@prismicio/client')
const PrismicDOM = require('prismic-dom')

const initApi = (req) => {
  return Prismic.getApi(process.env.PRISMIC_ENDPOINT, {
    accessToken: process.env.PRISMIC_ACCESS_TOKEN,
    req
  })
}

// Link Resolver
const handleLinkResolver = (doc) => {
  if (doc.type === 'product') {
    return `/detail/${doc.slug}`
  }

  if (doc.type === 'about') {
    return '/about'
  }

  if (doc.type === 'collections') {
    return '/collections'
  }

  return '/'
}

// Middleware to inject prismic context
app.use((req, res, next) => {
  res.locals.Link = handleLinkResolver
  res.locals.PrismicDOM = PrismicDOM
  res.locals.Numbers = index => {
    return index === 0 ? 'One' : index === 1 ? 'Two' : index === 2 ? 'Three' : index === 3 ? 'Four' : ''
  }
  next()
})

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

// Default values for each page
const handleRequest = async api => {
  const meta = await api.getSingle('meta')
  const navigation = await api.getSingle('navigation')
  const preloader = await api.getSingle('preloader')
  return {
    meta,
    navigation,
    preloader
  }
}

app.get('/', async (req, res) => {
  const api = await initApi(req)
  const home = await api.getSingle('home')
  const defaults = await handleRequest(api)

  const { results: collections } = await api.query(Prismic.Predicates.at('document.type', 'collection'), {
    fetchLinks: 'product.image'
  })
  res.render('pages/home', {
    ...defaults,
    collections,
    home
  })
})

app.get('/about', async (req, res) => {
  const api = await initApi(req)
  const defaults = await handleRequest(api)
  const about = await api.getSingle('about')
  res.render('pages/about', {
    ...defaults,
    about
  })

  // res.render('pages/about')
})

app.get('/collections', async (req, res) => {
  const api = await initApi(req)
  const defaults = await handleRequest(api)
  const home = await api.getSingle('home')

  const { results: collections } = await api.query(Prismic.Predicates.at('document.type', 'collection'), {
    fetchLinks: 'product.image'
  })

  res.render('pages/collections', {
    ...defaults,
    home,
    collections
  })
})

app.get('/detail/:uid', async (req, res) => {
  const api = await initApi(req)
  const defaults = await handleRequest(api)
  const product = await api.getByUID('product', req.params.uid, {
    fetchLinks: 'collection.title'
  })
  res.render('pages/detail', {
    ...defaults,
    product
  })

  // res.render('pages/detail')
})

app.listen(port, () => {
  console.log(`Server is listening on http://localhost:${port}`)
})
