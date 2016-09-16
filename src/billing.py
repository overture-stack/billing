from flask import Flask, render_template, request, g
from flask_login import login_required
from dateutil.parser import parse
from collaboratory import Collaboratory

app = Flask(__name__)

database = Collaboratory.default_init()


@app.route('/')
def root():
    return render_template('template.html', projects=database.get_projects())


@app.route('/by_user', methods=['GET'])
def calculate_cost_by_user():
    start_date = parse(request.args.get('start_date'), ignoretz=True)
    end_date = parse(request.args.get('end_date'), ignoretz=True)
    project_id = request.args.get('project_id')
    user_id = request.args.get('user_id')

    instance_core_hours = database.get_instance_core_hours_by_user(start_date, end_date, project_id, user_id)

    volume_gigabyte_hours = database.get_volume_gigabyte_hours_by_user(start_date, end_date, project_id, user_id)

    users = database.get_users_by_project(project_id)

    return render_template('search_by_user.html',
                           start_date=start_date,
                           end_date=end_date,
                           instance_core_hours=instance_core_hours,
                           volume_gb_hours=volume_gigabyte_hours,
                           project_id=project_id,
                           users=users,
                           current_user_id=user_id,
                           projects=database.get_projects())


# Might wanna do javascript in order to allow for a dynamic path variable
@app.route('/by_project', methods=['GET'])
def calculate_cost_by_project():
    start_date = parse(request.args.get('start_date'), ignoretz=True)
    end_date = parse(request.args.get('end_date'), ignoretz=True)
    project_id = request.args.get('project_id')

    instance_core_hours = database.get_instance_core_hours_by_project(start_date, end_date, project_id)

    volume_gigabyte_hours = database.get_volume_gigabyte_hours_by_project(start_date, end_date, project_id)

    image_gigabyte_hours = database.get_image_storage_gigabyte_hours_by_project(start_date, end_date, project_id)

    users = database.get_users_by_project(project_id)

    return render_template('search_by_project.html',
                           start_date=start_date,
                           end_date=end_date,
                           instance_core_hours=instance_core_hours,
                           volume_gb_hours=volume_gigabyte_hours,
                           image_gb_hours=image_gigabyte_hours,
                           project_id=project_id,
                           users=users,
                           projects=database.get_projects())


if __name__ == '__main__':
    app.run()
