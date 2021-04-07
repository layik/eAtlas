
# eAtlas · [![Node CI](https://github.com/layik/eAtlas/workflows/Node%20CI/badge.svg?branch=master)](https://github.com/layik/eAtlas/actions?query=workflow%3A%22Node+CI%22)

#### This README is for branch `spenser`

The `eAtlas` project itself has a different README.

### SPENSER

For development and production config/instructions see the “master” branch.

This branch is built over at `https://hub.docker.com/layik:spenser`

It is also pulled form our server on www.geospenser.com

## Deployment Pipeline

The production server has an instance of `watchtower` container which watches changes on the hub.docker.com image. It automatically restarts the `spenser` container running.

The data is released on this repo’s `dataset` release. Therefore, once the data is updated and a new push is sent to this repo which of course starts a new build on hub.docker.com, the production instance(s) pull(s) the update.

## Development

It would be wise to use the official npm package of eAtlas had it not been for the necessary subsetting of the data on remote server. This requires a custom fork/branch and hence this fork. To develop this branch, all development docs on the master/main branch applies. There is no structual change in terms of stack or the application being a geoplumber app.

## Data workflows

The original output comes from the SPENSER microsimulation which generates CSV files for each geography. Processing this output is done via a separate repo under `layik/spenser` private repo.

## News/changes

  - Latest SPENSER output form March 2021

<!-- build this Rmd with: R -e "rmarkdown::render('README.Rmd')" -->
