const debug = require('debug')('utils:db')
const { existsSync, unlinkSync } = require('fs')
const loki = require('lokijs')
const { promisify } = require('util')
const {
  getDataPaths,
  getRuleData,
  getXmlData,
  getBenchmarkData
} = require('./')
const { join } = require('path')

const getXmlArr = async files => {
  debug('getXmlArr start')
  const xmlDataArr = []
  for await (const file of files) {
    const { err: errXml, benchmark } = await getXmlData({ file })
    if (errXml) {
      debug('error in initDb with getXmlData')
      return { err: errXml }
    }
    xmlDataArr.push(benchmark)
  }
  debug(`getXmlArr end, data length of ${xmlDataArr.length}`)
  return { xmlDataArr }
}

const getBmArr = async xmlDataArr => {
  debug('start getBmArr')
  const bmDataArr = []
  for await (const data of xmlDataArr) {
      const {
        err,
        title,
        description,
        release,
        version,
        date,
        rules
      } = await getBenchmarkData(data)

      if (err) {
        debug('error in getBenchmarkData')
        return { err }
      }

      bmDataArr.push({
          title,
          description,
          release,
          version,
          date,
          rules
      })
  }
  debug(`end getBmArr, data length of ${bmDataArr.length}`)
  return { bmDataArr }
}

const mkDb = ({ data, dataDir }) => {
  return new Promise(async (resolve, reject) => {
    debug('start mkDb')
    const dbPath = join(dataDir, 'database.db')
    if (existsSync(dbPath)) {
      unlinkSync(dbPath)
    }
    const db = new loki(dbPath)
    const stigsDb = db.addCollection('stigs', {
      unique: ['title'],
      disableMeta: true
    })
    const rulesDb = db.addCollection('rules', {
      indices: ['stigId', 'ruleId', 'stigIndex'],
      disableMeta: true
    })
    for await (const benchmark of data) {
      const {
        title,
        description,
        release,
        version,
        date,
        rules
      } = benchmark

      const stigEntry = stigsDb.insert({
         title,
         description,
         release,
         version,
         date
      })

      const stigIndex = stigEntry.$loki

      for await (const rule of rules) {
        const {
          err: errRule,
          stigId,
          ruleId,
          severity,
          title,
          description,
          fixText,
          checkText
        } = await getRuleData(rule)

        if (errRule) {
          debug('error in getting rule')
          resolve({ err: errRule })
        }

        rulesDb.insert({
          stigId,
          ruleId,
          severity,
          title,
          description,
          fixText,
          checkText,
          stigIndex
      })
      }
    }
    const x = db.saveDatabase(async () => {
      debug('end mkDb')
      resolve({ stigsDb, rulesDb })
    })
  })
}

const collectData = async () => {
  debug('collectData Start')
  const { err: errFiles, files } = await getDataPaths()
  if (errFiles) {
    debug('error with getDataPaths')
    return { err: errFiles }
  }
  debug(`getDataPaths returned ${files.length} files`)

  const { err: errXmlArr, xmlDataArr } = await getXmlArr(files)
  if (errXmlArr) {
    debug('error with getXmlArr')
    return { err: errFiles }
  }

  const { err: errBmData, bmDataArr } = await getBmArr(xmlDataArr)
  if (errBmData) {
    debug('error with getBmArr')
    return { err: errBmData }
  }

  debug('collectData end')
  return { bmDataArr }
}

const initDb = async (dataDir) => {
  debug('initDb start')
  const { err: errCollect, bmDataArr } = await collectData()
  if (errCollect) {
    debug('error in collectData')
    return { err: errCollect }
  }

  const { err: errMkDb, stigsDb, rulesDb } = await mkDb({ data: bmDataArr, dataDir })
  if (errMkDb) {
    debug('error in mkDb')
    return { err: errMkDb }
  }
  debug('initDb end')
  return { stigsDb, rulesDb }
}

const getDb = async (dataDir) => {
  return new Promise((resolve, reject) => {
    const dbPath = join(dataDir, 'database.db')
    const ldb = new loki(dbPath)
    ldb.loadDatabase({}, (res) => {
      const rulesDb = ldb.getCollection('rules')
      const stigsDb = ldb.getCollection('stigs')
      resolve({ stigsDb, rulesDb })
    })
  })
}

module.exports = { initDb, getDb }