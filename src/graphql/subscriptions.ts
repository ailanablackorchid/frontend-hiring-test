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

export const MESSAGE_UPDATED = gql`
  subscription {
    messageUpdated {
      id
      text
      status
      updatedAt
      sender
    }
  }
`;
