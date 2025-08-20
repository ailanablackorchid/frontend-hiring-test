import { gql } from "@apollo/client";

export const MESSAGE_ADDED = gql`
  subscription {
    messageAdded {
      id
      text
      status
      updatedAt
      sender
    }
  }
`;
