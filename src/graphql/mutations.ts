import { gql } from "@apollo/client";

export const SEND_MESSAGE = gql`
  mutation SendMessage($text: String!) {
    sendMessage(text: $text) {
      id
      text
      status
      updatedAt
      sender
    }
  }
`;
