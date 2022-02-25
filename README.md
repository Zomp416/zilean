## Zilean

Zilean is a REST-based, back-end service responsible for performing CRUD operations relating to Zomp application data.

Zilean is powered by
[Node.js](https://nodejs.org/en/),
[Typescript](https://www.typescriptlang.org/),
[Express](https://www.express.com/), and
[Mongoose](https://www.mongoose.com/).

### Developers
- [Cesare Lucido](https://github.com/clucidojr123)
- [Keith Zhang](https://github.com/keithohno)
- [Matthew Ho](https://github.com/matthew-ho-1)
- [Jack Liu](https://github.com/jliu2882)

## Installation

First, make sure you have Node.js and npm installed on your machine. To install the dependencies for the application, run the following commands:

```sh
cd zilean
npm install
```

## Starting the Application

You can start the application in a development or production environment. Right now, there are no differences between the development and production environments. 

Running the development script launches nodemon, which will automatically restart the application upon detecting changes.

```sh
npm run dev
```

Or 

```sh
npm run prod
```

## Formatting Code

Before submitting a pull request or pushing changes, please make sure to format the codebase using the following:
```sh
npm run format
```