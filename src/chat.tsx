import React, { useEffect, useState } from "react";
import { ItemContent, Virtuoso } from "react-virtuoso";
import cn from "clsx";
import {
  MessageEdge,
  MessagePage,
  MessageSender,
  type Message,
} from "../__generated__/resolvers-types";
import css from "./chat.module.css";
import { gql, useQuery } from "@apollo/client";

// const temp_data: Message[] = Array.from(Array(30), (_, index) => ({
//   id: String(index),
//   text: `Message number ${index}`,
//   status: MessageStatus.Read,
//   updatedAt: new Date().toISOString(),
//   sender: index % 2 ? MessageSender.Admin : MessageSender.Customer,
// }));

const PAGE_SIZE = 5;

const MESSAGES_QUERY = gql`
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

const Item: React.FC<Message> = ({ text, sender, status }) => {
  return (
    <div className={css.item}>
      <div
        className={cn(
          css.message,
          sender === MessageSender.Admin ? css.out : css.in
        )}>
        {text}
        {/* TODO: loader on uploading new messages */}
        {"(" + status + ")"}
      </div>
    </div>
  );
};

const getItem: ItemContent<Message, unknown> = (_, data) => {
  return <Item {...data} />;
};

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  const {
    data: messagesData,
    loading: isMessagesDataLoading,
    fetchMore,
  } = useQuery<{
    messages: MessagePage;
  }>(MESSAGES_QUERY, {
    variables: { first: PAGE_SIZE },
  });

  useEffect(() => {
    if (messagesData?.messages?.edges) {
      const fetched = messagesData.messages.edges.map((e: MessageEdge) => e.node);
      setMessages(fetched);
    }
  }, [messagesData]);

  return (
    <div className={css.root}>
      <div className={css.container}>
        {/* TODO: loader on uploading new messages */}
        {isMessagesDataLoading && <p>loading...</p>}
        <Virtuoso
          className={css.list}
          data={messages}
          itemContent={getItem}
          endReached={() => {
            if (messagesData?.messages.pageInfo.hasNextPage) {
              fetchMore({
                variables: {
                  first: PAGE_SIZE,
                  after: messagesData.messages.pageInfo.endCursor,
                },
              }).then((res) => {
                const fetched = res.data.messages.edges.map(
                  (e: MessageEdge) => e.node
                );
                setMessages(fetched);
              });
            }
          }}
        />
      </div>
      <div className={css.footer}>
        <input
          type="text"
          className={css.textInput}
          placeholder="Message text"
        />
        {/* TODO: send on enter key click */}
        <button>Send</button>
      </div>
    </div>
  );
};
