from flask import Flask, render_template, request
from dateutil.parser import parse
from collaboratory import Collaboratory

app = Flask(__name__)

database = Collaboratory.default_init()


@app.route('/')
def root():
    return render_template('template.html')


@app.route('/cost', methods=['GET'])
def calculate_cost():
    start_date = parse(request.args.get('start_date'), ignoretz=True)
    end_date = parse(request.args.get('end_date'), ignoretz=True)

    project_id = "8e95a3bd98bb4560a12a0dc6d9f265e4"
    user_id = "19f5e963e6e1429897ecabb52f958c2f"

    # INSTANCES---------------------------------------------------------------------------------------------------------

    instance_core_hours = database.get_instance_core_hours_by_user(start_date, end_date, user_id)

    volume_gigabyte_hours = database.get_volume_gigabyte_hours_by_user(start_date, end_date, user_id)

    image_gigabyte_hours = database.get_image_storage_gigabyte_hours_by_project(start_date, end_date, project_id)

    return render_template('test-response.html',
                           start_date=start_date,
                           end_date=end_date,
                           instance_core_hours=instance_core_hours,
                           volume_gb_hours=volume_gigabyte_hours,
                           image_gb_hours=image_gigabyte_hours)


if __name__ == '__main__':
    app.run()
