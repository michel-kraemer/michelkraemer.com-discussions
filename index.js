import { graphql } from "@octokit/graphql"
import fs from "fs/promises"
import path from "path"

// required env variables
const GITHUB_ACCESS_TOKEN = process.env["GITHUB_ACCESS_TOKEN"]
const GITHUB_REPOSITORY = process.env["GITHUB_REPOSITORY"]
const DISCUSSION_NUMBER = process.env["DISCUSSION_NUMBER"]

const [owner, repo] = GITHUB_REPOSITORY.split("/")

async function fetchComments({ result, cursor } = { result: {} }) {
  let response = await graphql(`
    query($cursor:String) {
      repository(owner: "${owner}", name: "${repo}") {
        discussion(number: ${DISCUSSION_NUMBER}) {
          id
          url
          locked
          title
          body
          bodyHTML

          reactions {
            totalCount
          }

          reactionGroups {
            content
            users {
              totalCount
            }
            viewerHasReacted
          }

          comments(first: 100, after: $cursor) {
            totalCount

            pageInfo {
              startCursor
              hasNextPage
              hasPreviousPage
              endCursor
            }

            nodes {
              id
              upvoteCount
              viewerHasUpvoted
              viewerCanUpvote
              author {
                avatarUrl
                login
                url
              }
              viewerDidAuthor
              createdAt
              url
              authorAssociation
              lastEditedAt
              deletedAt
              isMinimized
              bodyHTML
              reactionGroups {
                content
                users {
                  totalCount
                }
                viewerHasReacted
              }
              replies(last: 100) {
                totalCount
                nodes {
                  id
                  author {
                    avatarUrl
                    login
                    url
                  }
                  viewerDidAuthor
                  createdAt
                  url
                  authorAssociation
                  lastEditedAt
                  deletedAt
                  isMinimized
                  bodyHTML
                  reactionGroups {
                    content
                    users {
                      totalCount
                    }
                    viewerHasReacted
                  }
                  replyTo {
                    id
                  }
                }
              }
            }
          }
        }
      }
    }
  `,
  {
    cursor,
    headers: {
      authorization: `token ${GITHUB_ACCESS_TOKEN}`
    }
  })

  if (result.discussion === undefined) {
    result.discussion = { ...response.repository.discussion }
    result.discussion.comments = {
      totalCount: response.repository.discussion.comments.totalCount,
      nodes: []
    }
  }
  result.discussion.comments.nodes.push(...response.repository.discussion.comments.nodes)

  if (response.repository.discussion.comments.pageInfo.hasNextPage) {
    await fetchComments({ result, cursor: response.repository.discussion.comments.pageInfo.endCursor })
  }

  return result.discussion
}

console.log(`Fetching discussion ${DISCUSSION_NUMBER} ...`)
let discussion = await fetchComments()
console.log(`Fetched ${discussion.comments.nodes.length} comments.`)

// TODO get filename from discussion.title or extract it from discussion.body
let destFileName = discussion.id
let destFilePath = path.join("discussions", destFileName)
console.log(`Writing to ${destFilePath} ...`)
await fs.writeFile(destFilePath, JSON.stringify(discussion))

console.log("Done.")
