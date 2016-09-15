from flask import Flask, render_template, request
from dateutil.parser import parse
from collaboratory import Collaboratory

app = Flask(__name__)

database = Collaboratory.default_init()


@app.route('/')
def root():
    return render_template('template.html')


@app.route('/cost_new', methods=['GET'])
def calculate_cost_new():
    start_date = parse(request.args.get('start_date'), ignoretz=True)
    end_date = parse(request.args.get('end_date'), ignoretz=True)

    return render_template('test-response.html',
                           start_date=start_date,
                           end_date=end_date)


@app.route('/cost', methods=['GET'])
def calculate_cost():
    start_date = parse(request.args.get('start_date'), ignoretz=True)
    end_date = parse(request.args.get('end_date'), ignoretz=True)

    user_id = "19f5e963e6e1429897ecabb52f958c2f"

    # INSTANCES---------------------------------------------------------------------------------------------------------

    core_hours = database.get_instance_core_hours_one_query(start_date, end_date, user_id)

    gigabyte_hours = database.get_volume_gigabyte_hours(start_date, end_date, user_id)

    return render_template('test-response.html',
                           start_date=start_date,
                           end_date=end_date,
                           core_hours=core_hours,
                           gb_hours=gigabyte_hours)


if __name__ == '__main__':
    app.run()
