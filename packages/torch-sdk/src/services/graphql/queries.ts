import { gql } from 'graphql-request'

export const GET_POOLS = gql`
  query {
    pools {
      lpAsset {
        asset {
          type
          jettonMaster
          currencyId
        }
      }
      assets {
        asset {
          type
          jettonMaster
          currencyId
        }
      }
      type
      useRates
      basePool {
        lpAsset {
          asset {
            type
            jettonMaster
            currencyId
          }
        }
        assets {
          asset {
            type
            jettonMaster
            currencyId
          }
        }
        type
        useRates
      }
    }
  }
`

export const GET_POOL_BY_ADDRESS = gql`
  query ($address: String!) {
    poolByAddress(address: $address) {
      lpAsset {
        asset {
          type
          jettonMaster
          currencyId
        }
        name
        symbol
        decimals
        image
        description
      }
      assets {
        asset {
          type
          jettonMaster
          currencyId
        }
        name
        symbol
        decimals
        image
        description
      }
      type
      useRates
      basePool {
        lpAsset {
          asset {
            type
            jettonMaster
            currencyId
          }
          name
          symbol
          decimals
          image
          description
        }
        assets {
          asset {
            type
            jettonMaster
            currencyId
          }
          name
          symbol
          decimals
          image
          description
        }
        type
        useRates
      }
    }
  }
`
export const GET_TOKENS = gql`
  query ($tokenInId: String) {
    tokens(tokenInId: $tokenInId) {
      asset {
        type
        jettonMaster
        currencyId
      }
      name
      symbol
      decimals
      image
      description
    }
  }
`
