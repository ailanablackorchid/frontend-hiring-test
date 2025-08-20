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
import { gql, useMutation, useQuery } from "@apollo/client";
import { MESSAGES_QUERY } from "./graphql/queries";

const PAGE_SIZE = 5;

const SEND_MESSAGE = gql`
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
  const [sendMessage] = useMutation(SEND_MESSAGE);
  const [text, setText] = useState<string>("");

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
    console.log("updateMessagesFromData", messagesData?.messages);
    if (messagesData?.messages?.edges) {
      const fetched = messagesData?.messages?.edges?.map(
        (e: MessageEdge) => e?.node
      );
      setMessages(fetched);
    }
  }

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage({
      variables: { text },
    });

    setText("");
  };

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
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {/* TODO: send on enter key click */}
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};
