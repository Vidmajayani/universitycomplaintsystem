import logging


class LogMaker:
    @staticmethod
    def log_gen():
        # date format
        # timestamp
        logging.basicConfig(
            filename=".\\tests\\logs\\complanet.log",
            format="%(asctime)s: %(levelname)s: %(message)s",
            datefmt="%d/%m/%Y %H:%M:%S",
            force=True,
        )
        logger = logging.getLogger()
        logger.setLevel(logging.INFO)
        return logger
