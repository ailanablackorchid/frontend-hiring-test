import React, { useEffect, useState } from "react";
import { ItemContent, Virtuoso } from "react-virtuoso";
import cn from "clsx";
import {
  MessageEdge,
  MessagePage,
  MessageSender,
  MessageStatus,
  type Message,
} from "../__generated__/resolvers-types";
import css from "./chat.module.css";
import { useMutation, useQuery, useSubscription } from "@apollo/client";
import { MESSAGES_QUERY } from "./graphql/queries";
import { SEND_MESSAGE } from "./graphql/mutations";
import { MESSAGE_ADDED, MESSAGE_UPDATED } from "./graphql/subscriptions";

const PAGE_SIZE = 5;

const Item: React.FC<Message> = ({ text, sender, status }) => {
  return (
    <div className={css.item}>
      <div
        className={cn(
          css.message,
          sender === MessageSender.Admin ? css.out : css.in
        )}>
        <div className={css.messageSender}>{sender}</div>
        <p className={css.messageText}>{text}</p>
        {sender === MessageSender.Admin && (
          <div
            className={cn(
              css.messageStatus,
              status === "Read" && css.messageStatusRead
            )}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
};

const getItem: ItemContent<Message, unknown> = (_, data) => {
  return <Item {...data} />;
};

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
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

  useSubscription(MESSAGE_ADDED, {
    onData: ({ data }) => {
      const newMessage = data.data?.messageAdded;
      console.log("New message:", newMessage);
      if (!newMessage) return;

      setMessages((prev) => {
        const withoutOptimistic = prev.filter(
          (m) =>
            !(
              m.text === newMessage.text &&
              m.sender === newMessage.sender &&
              m.status === "Sending"
            )
        );
        if (withoutOptimistic.find((m) => m.id === newMessage.id))
          return withoutOptimistic;
        return [...withoutOptimistic, newMessage];
      });
    },
  });

  useSubscription(MESSAGE_UPDATED, {
    onData: ({ data }) => {
      const updated = data.data?.messageUpdated;
      console.log("Updated message:", updated);
      if (!updated) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === updated.id && updated.updatedAt > m.updatedAt
            ? { ...m, ...updated }
            : m
        )
      );
    },
  });

  // Send message mutation
  const [sendMessage] = useMutation(SEND_MESSAGE);

  useEffect(() => {
    if (messagesData?.messages?.edges) {
      const fetched = messagesData.messages.edges.map((e) => e.node);
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...prev, ...fetched.filter((m) => !seen.has(m.id))];
      });
    }
  }, [messagesData]);

  useEffect(() => {
    console.log("Messages updated:", messages);
  }, [messages]);

  const handleSend = () => {
    if (!text.trim()) return;
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      text,
      status: MessageStatus.Sending,
      updatedAt: new Date().toISOString(),
      sender: MessageSender.Admin,
      __typename: "Message",
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    sendMessage({ variables: { text } });
    setText("");
  };

  return (
    <div className={css.root}>
      <div className={css.container}>
        <Virtuoso
          className={css.list}
          data={messages}
          itemContent={getItem}
          followOutput="smooth"
          endReached={() => {
            if (messagesData?.messages?.pageInfo?.hasNextPage) {
              fetchMore({
                variables: {
                  first: PAGE_SIZE,
                  after: messagesData?.messages?.pageInfo?.endCursor,
                },
              }).then((res) => {
                const fetched = res.data.messages.edges.map(
                  (e: MessageEdge) => e.node
                );
                setMessages((prev) => {
                  const seen = new Set(prev.map((m: Message) => m.id));
                  return [
                    ...prev,
                    ...fetched.filter((m: Message) => !seen.has(m.id)),
                  ];
                });
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
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSend();
            }
          }}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};
