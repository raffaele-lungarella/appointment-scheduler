# Domain

The following folder contains all the types related to the business logic. The reason because it lives in the `server` folder is to avoid the direct access from the client to this types. Thus avoiding to expose ids, password hashes and other stuff that the client should never see.

To access this data see the `dto` folder.
