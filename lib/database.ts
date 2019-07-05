import { readFileSync } from 'fs'

import { Db, MongoClient, MongoClientOptions } from 'mongodb'

let dbInstance: Db | null
let mongoClient: MongoClient

export async function connect(
  mongoUri: string,
  isProduction = false,
  connectionRetryWait = 5,
  connectionRetryMax = 10,
  certFileUri?: string
) {
  let mongoOptions: MongoClientOptions = { useNewUrlParser: true }

  if (certFileUri) {
    let certFileBuf = [readFileSync(certFileUri)]

    mongoOptions = {
      ssl: true,
      sslValidate: true,
      sslCA: certFileBuf,
      poolSize: 1,
      useNewUrlParser: true,
    }
  }

  if (isProduction === false) {
    mongoOptions = { useNewUrlParser: true }
  }

  let retryAttempt = 0
  let lastException

  if (!connectionRetryMax) {
    connectionRetryMax = 1
  }

  while (retryAttempt < connectionRetryMax && !dbInstance) {
    try {
      mongoClient = await MongoClient.connect(mongoUri, mongoOptions)
      dbInstance = mongoClient.db()
    } catch (ex) {
      retryAttempt++
      lastException = ex
      console.log(ex.message)
      if (connectionRetryWait) {
        console.log(`${retryAttempt}: Retrying in ${connectionRetryWait}s...`)
        await sleep(connectionRetryWait)
      }
    }
  }

  if (!dbInstance) {
    if (!lastException) {
      throw new Error(
        'Unable to connect to the database, please verify that your configuration is correct'
      )
    }
    throw new Error(lastException)
  }
}

function sleep(seconds: number) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000))
}

export async function close(force = false) {
  if (mongoClient) {
    await mongoClient.close(force)
    dbInstance = null
  }
}

export function connectionStatus() {
  if (mongoClient) {
    return mongoClient.isConnected()
  }
  return false
}

export function getDbInstance(): Db {
  if (!dbInstance) {
    throw 'Database is not yet instantiated'
  }
  return dbInstance
}
