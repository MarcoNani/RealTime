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
- type (string)
- typing (bool)

### IndexedDB Schema Updates
- Added `Messages` object store with the following fields:
  - `messageId` (string, primary key)
  - `roomId` (string, indexed)
  - `payload` (string)
  - `timestamp` (string)
  - `publicId` (string)
  - `type` (string)
  - `typing` (bool)