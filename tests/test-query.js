const { test } = require('tape')
const {
  getBenchmarks,
  getBenchmark,
  getRules,
  getRule
} = require('../src/utils/query')

test('Query', async t => {
  t.test('get all benchmarks', async t => {
    const { err: errGB, data } = await getBenchmarks('/tmp/')
    if (errGB) {
      return t.fail(errGB.message)
    }
    t.ok(!errGB, 'no error in calling getBenchmarks')
    t.ok(data.length > 200, 'data received')
    t.end()
  })

  t.test('get specific benchmark', async t => {
    t.comment('get benchmark by title')
    const params = {
      dataDir: '/tmp/',
      title: 'Microsoft OneNote 2013 STIG'
    }
    const { err, data } = await getBenchmark(params)
    if (err) {
      return t.fail(err.message)
    }
    t.ok(!err, 'no errors in getBenchmark')
    t.ok(data, 'data received')
    const { title, date, $loki, release, version } = data
    t.ok(title, 'title in object')
    t.ok(date, 'date in object')
    t.ok($loki, 'index in object')
    t.ok(release, 'release in object')
    t.ok(version, 'version in object')
    t.end()
  })

  t.test('get all rules for a benchmark', async t => {
    const params = {
      dataDir: '/tmp',
      benchmarkTitle: 'F5 BIG-IP Advanced Firewall Manager 11.x Security Technical Implementation Guide'
    }
    t.comment('get rules by benchmark title')
    const { err, data } = await getRules(params)
    if (err) {
      return t.fail(err.message)
    }
    t.ok(!err, 'no error in getRules')
    t.ok(data.length > 1, 'getRules got data')

    {
      t.comment('get rules by index')
      const params = {
        dataDir: '/tmp',
        benchmarkIndex: 22
      }
      const { err, data } = await getRules(params)
      if (err) {
        return t.fail(err.message)
      }
      t.ok(!err, 'no error in getRules')
      t.ok(data.length > 0, 'getRules got data')
    }

    {
      t.comment('get rules at severity')
      const params = {
        dataDir: '/tmp',
        benchmarkIndex: 22,
        severity: 'high'
      }
      const { err, data } = await getRules(params)
      if (err) {
        return t.fail(err.message)
      }
      t.ok(!err, 'no error in getRules')
      t.ok(data.length > 0, 'getRules got data')
      for await (const rule of data) {
        t.ok(rule.severity === 'high', 'high severity received')
      }
    }
    t.end()
  })

  t.test('get specific rules', async t => {
    t.comment('get rule by stigId')
    const params = {
      stigId: 'V-65319',
      dataDir: '/tmp'
    }
    const { err, data } = await getRule(params)
    if (err) {
      t.fail(err.message)
    }
    t.ok(!err, 'no error in getRule()')
    t.ok(data, 'data received')
    t.ok(data.stigId === params.stigId)
    {
      t.comment('get rule by rule id')
      const params = {
        ruleId: 'SV-79905r1_rule',
        dataDir: '/tmp'
      }
      const { err, data } = await getRule(params)
      if (err) {
        t.fail(err.message)
      }
      t.ok(!err, 'no error in getRule()')
      t.ok(data, 'data received')
      t.ok(data.ruleId === params.ruleId)
    }
    t.end()
  })

  t.end()
})