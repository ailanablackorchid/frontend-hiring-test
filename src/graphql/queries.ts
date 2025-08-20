import { gql } from "@apollo/client";

export const MESSAGES_QUERY = gql`
  query Messages($first: Int!, $after: MessagesCursor) {
    messages(first: $first, after: $after) {
      edges {
        node {
          id
          text
          status
          updatedAt
          sender
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
