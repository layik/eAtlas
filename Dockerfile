FROM rstudio/r-base:4.0-focal

RUN apt-get update \ 
	&& apt-get install -y --no-install-recommends \
		software-properties-common \
    ed \
		less \
		locales \
		vim-tiny \
		wget \
		ca-certificates \
    && apt-get update 

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    lbzip2 \
    libfftw3-dev \
    libgdal-dev \
    libgeos-dev \
    libgsl0-dev \
    libgl1-mesa-dev \
    libglu1-mesa-dev \
    libhdf4-alt-dev \
    libhdf5-dev \
    libproj-dev \
    libprotobuf-dev \
    libnetcdf-dev \
    libsqlite3-dev \
    # required for plumber
    libsodium-dev \ 
    libssl-dev \
    libudunits2-dev \
    netcdf-bin \
    tk-dev \
    unixodbc-dev \
    libv8-dev \
    protobuf-compiler \ 
    git

# RUN apt-get install -y r-cran-devtools r-cran-sf r-cran-plumber

RUN R -e 'install.packages(c("data.table", "curl", "plumber"), dependencies=T)'
# RUN R -e 'devtools::install_github("ATFutures/geoplumber")'

# add node/npm
RUN apt-get -y install curl gnupg
RUN curl -sL https://deb.nodesource.com/setup_12.x  | bash -
RUN apt-get -y install nodejs

ADD . /app

# build
WORKDIR /app
RUN npm install
RUN npm install create-react-app
RUN npm run build
RUN rm -rf node_modules

EXPOSE 8000

ENTRYPOINT ["R", "-e", "setwd('/app'); plumber::plumb('R/plumber.R')$run(host='0.0.0.0',port=8000)"]
