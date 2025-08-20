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
import { MESSAGE_ADDED } from "./graphql/subscriptions";

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
        console.log("prevState Added", prev);

        if (prev.find((m: Message) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    },
  });

  // Send message mutation
  const [sendMessage] = useMutation(SEND_MESSAGE);

  const updateMessagesFromData = (
    setMessages: (msgs: Message[]) => void,
    messagesData?: { messages?: MessagePage }
  ) => {
    console.log("updateMessagesFromData", messagesData?.messages);
    if (messagesData?.messages?.edges) {
      const fetched = messagesData?.messages?.edges?.map(
        (e: MessageEdge) => e?.node
      );
      // setMessages(fetched);
      setMessages(
        ((prev) => {
          const seen = new Set(prev.map((m: Message) => m.id));
          return [...prev, ...fetched.filter((m) => !seen.has(m.id))];
        })(messages)
      );
    }
  };

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
    setMessages((prev) => [...prev, optimisticMsg]); // <-- Add this line

    sendMessage({
      variables: { text },
      optimisticResponse: {
        sendMessage: optimisticMsg,
      },
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
          followOutput="smooth"
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
