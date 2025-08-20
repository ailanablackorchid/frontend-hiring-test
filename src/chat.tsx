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
import { useQuery } from "@apollo/client";
import { MESSAGES_QUERY } from "./graphql/queries";

const PAGE_SIZE = 5;

const Item: React.FC<Message> = ({ text, sender, status }) => {
  return (
    <div className={css.item}>
      <div
        className={cn(
          css.message,
          sender === MessageSender.Admin ? css.out : css.in
        )}>
        {text}
        {/* TODO: style message status */}
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

  // Fetch messages with pagination
  const {
    data: messagesData,
    loading: isMessagesDataLoading,
    fetchMore,
  } = useQuery<{
    messages: MessagePage;
  }>(MESSAGES_QUERY, {
    variables: { first: PAGE_SIZE },
  });

  function updateMessagesFromData(
    setMessages: (msgs: Message[]) => void,
    messagesData?: { messages?: MessagePage }
  ) {
    if (messagesData?.messages?.edges) {
      const fetched = messagesData?.messages?.edges?.map(
        (e: MessageEdge) => e?.node
      );
      setMessages(fetched);
    }
  }

  useEffect(() => {
    updateMessagesFromData(setMessages, messagesData);
  }, [messagesData]);

  return (
    <div className={css.root}>
      <div className={css.container}>
        <Virtuoso
          className={css.list}
          data={messages}
          itemContent={getItem}
          endReached={() => {
            if (messagesData?.messages?.pageInfo?.hasNextPage) {
              fetchMore({
                variables: {
                  first: PAGE_SIZE,
                  after: messagesData?.messages?.pageInfo?.endCursor,
                },
              }).then((res) => {
                updateMessagesFromData(setMessages, res?.data);
              });
            }
          }}
        />
        {isMessagesDataLoading && (
          <div className={css.loading}>Loading messages...</div>
        )}
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
