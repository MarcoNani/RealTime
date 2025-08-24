## Rooms
- roomId (string)
- members (array of only publicId)
- latestMessageTimestamp (timestamp)

## Users
- publicId (string)
- username (string)

## Messages
- messageId (string)
- roomId (string)
- payload (string)
- timestamp (string)
- publicId (string)
- type (string) [text | images | system...]
- typing (bool)
- username (string) [added dynamically when fetching messages]